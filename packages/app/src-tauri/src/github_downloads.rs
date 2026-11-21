use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
    time::Duration,
};
use tauri::Manager;
#[cfg(not(any(target_os = "ios", target_os = "android")))]
use tauri_plugin_opener::OpenerExt;

fn download_path(owner: &str, repo: &str, kind: &str, id: u64) -> Result<String, String> {
    let valid = |part: &str| {
        !part.is_empty()
            && part != "."
            && part != ".."
            && part
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "_-.".contains(c))
    };
    if !valid(owner) || !valid(repo) || id == 0 {
        return Err("下载地址无效".into());
    }
    let suffix = match kind {
        "job" => format!("actions/jobs/{id}/logs"),
        "artifact" => format!("actions/artifacts/{id}/zip"),
        "release" => format!("releases/assets/{id}"),
        _ => return Err("下载地址无效".into()),
    };
    Ok(format!(
        "https://api.github.com/repos/{owner}/{repo}/{suffix}"
    ))
}
fn checked_location(value: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(value).map_err(|_| "下载地址无效".to_string())?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("下载地址无效".into());
    }
    Ok(url)
}
#[derive(Serialize)]
pub struct DownloadResult {
    url: Option<String>,
    text: Option<String>,
    truncated: bool,
    delivered: bool,
}

/// Credentials are sent once to api.github.com. Signed downloads use a new, unauthenticated request.
#[tauri::command]
pub async fn github_download(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    name: String,
    owner: String,
    repo: String,
    kind: String,
    id: u64,
    token: String,
) -> Result<DownloadResult, String> {
    if token.trim().is_empty() {
        return Err("请先登录".into());
    }
    let endpoint = download_path(&owner, &repo, &kind, id)?;
    #[cfg(target_os = "android")]
    crate::android_tls::initialize()?;
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(20))
        .timeout(Duration::from_secs(300))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "无法初始化下载连接".to_string())?;
    let response = client
        .get(endpoint)
        .bearer_auth(token)
        .header("User-Agent", "GitPulse")
        .header(
            "Accept",
            if kind == "release" {
                "application/octet-stream"
            } else {
                "application/vnd.github+json"
            },
        )
        .send()
        .await
        .map_err(|_| "无法连接 GitHub，请检查网络后重试".to_string())?;
    if response.status() == reqwest::StatusCode::OK && kind != "job" {
        let root = app
            .path()
            .app_cache_dir()
            .map_err(|_| "无法创建下载目录")?
            .join("downloads");
        let path = save_attachment(response, &root, &safe_name(&name, id), MAX_ATTACHMENT).await?;
        deliver_file(app, window, path).await?;
        return Ok(DownloadResult {
            url: None,
            text: None,
            truncated: false,
            delivered: true,
        });
    }
    let mut response = if response.status() == reqwest::StatusCode::OK && kind == "job" {
        response
    } else {
        let location = redirect_location(&response)?;
        if kind != "job" {
            return Ok(DownloadResult {
                url: Some(location.to_string()),
                text: None,
                truncated: false,
                delivered: false,
            });
        }
        // Never forward the API Authorization header to a download host.
        client
            .get(location)
            .send()
            .await
            .map_err(|_| "日志下载失败，请重试".to_string())?
            .error_for_status()
            .map_err(|_| "日志下载失败，请重试".to_string())?
    };
    let mut bytes = Vec::new();
    const MAX: usize = 2_000_000;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "日志下载失败，请重试".to_string())?
    {
        let available = MAX.saturating_sub(bytes.len());
        bytes.extend_from_slice(&chunk[..chunk.len().min(available)]);
        if chunk.len() > available {
            return Ok(DownloadResult {
                url: None,
                text: Some(String::from_utf8_lossy(&bytes).into_owned()),
                truncated: true,
                delivered: false,
            });
        }
    }
    Ok(DownloadResult {
        url: None,
        text: Some(String::from_utf8_lossy(&bytes).into_owned()),
        truncated: false,
        delivered: false,
    })
}
const MAX_ATTACHMENT: u64 = 512 * 1024 * 1024;
fn safe_name(name: &str, id: u64) -> String {
    let cleaned: String = name
        .chars()
        .filter(|c| !c.is_control() && !"/\\:<>\"|?*".contains(*c))
        .collect();
    let cleaned = cleaned.trim_matches([' ', '.']);
    let cleaned = if cleaned.is_empty() { "download" } else { cleaned };
    let prefix = format!("asset-{id}-");
    // Linux/Android filesystems limit a component by bytes, not Unicode chars.
    // Keep a useful extension while reserving space for the identity prefix.
    const MAX_NAME_BYTES: usize = 200;
    let (stem, extension) = match cleaned.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() && !extension.is_empty() && extension.len() <= 32 => {
            (stem, format!(".{extension}"))
        }
        _ => (cleaned, String::new()),
    };
    let budget = MAX_NAME_BYTES - prefix.len() - extension.len();
    let mut end = stem.len().min(budget);
    while !stem.is_char_boundary(end) { end -= 1; }
    format!("{prefix}{}{extension}", stem[..end].trim_end_matches([' ', '.']))
}
fn redirect_location(response: &reqwest::Response) -> Result<reqwest::Url, String> {
    if !response.status().is_redirection() {
        return Err(format!(
            "GitHub 下载请求失败（{}）",
            response.status().as_u16()
        ));
    }
    checked_location(
        response
            .headers()
            .get(reqwest::header::LOCATION)
            .and_then(|value| value.to_str().ok())
            .ok_or("下载链接不可用")?,
    )
}
struct PartialDownload {
    directory: PathBuf,
    complete: bool,
}
impl Drop for PartialDownload {
    fn drop(&mut self) {
        if !self.complete {
            let _ = std::fs::remove_dir_all(&self.directory);
        }
    }
}
async fn save_attachment(
    mut response: reqwest::Response,
    root: &Path,
    name: &str,
    limit: u64,
) -> Result<PathBuf, String> {
    if response.content_length().is_some_and(|size| size > limit) {
        return Err("附件超过下载大小限制（512 MB），请在 GitHub 下载".into());
    }
    std::fs::create_dir_all(root).map_err(|_| "无法创建下载目录")?;
    // Files handed to another app remain available for 24 hours. Partial files
    // are removed on error or cancellation, never handed to an opener.
    for entry in std::fs::read_dir(root)
        .map_err(|_| "无法读取下载目录")?
        .flatten()
    {
        if entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.elapsed().ok())
            .is_some_and(|age| age > Duration::from_secs(86400))
        {
            let _ = std::fs::remove_dir_all(entry.path());
        }
    }
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "系统时间无效")?
        .as_nanos();
    let directory = root.join(format!("{}-{unique}", std::process::id()));
    let mut builder = std::fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder.create(&directory).map_err(|_| "无法创建下载目录")?;
    let mut guard = PartialDownload {
        directory,
        complete: false,
    };
    let partial = guard.directory.join("payload.part");
    let mut options = std::fs::OpenOptions::new();
    options.create_new(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&partial).map_err(|_| "无法保存附件")?;
    let mut size = 0u64;
    while let Some(chunk) = response.chunk().await.map_err(|_| "附件下载中断，请重试")? {
        size = size.checked_add(chunk.len() as u64).ok_or("附件过大")?;
        if size > limit {
            return Err("附件超过下载大小限制（512 MB），请在 GitHub 下载".into());
        }
        file.write_all(&chunk).map_err(|_| "无法保存附件")?;
    }
    file.sync_all().map_err(|_| "无法保存附件")?;
    drop(file);
    let path = guard.directory.join(name);
    std::fs::rename(partial, &path).map_err(|_| "无法保存附件")?;
    guard.complete = true;
    Ok(path)
}
async fn deliver_file(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    path: PathBuf,
) -> Result<(), String> {
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        let _ = window;
        // Reveal, never execute an untrusted downloaded executable.
        tauri::async_runtime::spawn_blocking(move || app.opener().reveal_item_in_dir(path))
            .await
            .map_err(|_| "无法显示已下载附件")?
            .map_err(|_| "无法显示已下载附件".into())
    }
    #[cfg(target_os = "android")]
    {
        let _ = app;
        let (tx, rx) = tokio::sync::oneshot::channel();
        window
            .with_webview(move |webview| {
                webview.jni_handle().exec(move |env, activity, _| {
                    let result = env.new_string(path.to_string_lossy()).and_then(|path| {
                        env.call_method(
                            activity,
                            "shareDownloadedFile",
                            "(Ljava/lang/String;)V",
                            &[(&path).into()],
                        )
                        .map(|_| ())
                    });
                    if result.is_err() {
                        let _ = env.exception_clear();
                    }
                    let _ = tx.send(result.map_err(|_| "无法分享已下载附件".to_string()));
                });
            })
            .map_err(|_| "无法分享已下载附件")?;
        rx.await.map_err(|_| "无法分享已下载附件")?
    }
    #[cfg(target_os = "ios")]
    {
        let _ = app;
        let (tx, rx) = tokio::sync::oneshot::channel();
        window.with_webview(move |webview| {
            let result = unsafe {
                use objc2::{msg_send, runtime::{AnyClass, AnyObject}, rc::Retained};
                use objc2_foundation::{NSString, NSURL, NSArray};
                let view = &*webview.inner().cast::<AnyObject>();
                let ui_window: Option<Retained<AnyObject>> = msg_send![view, window];
                (|| {
                    let ui_window = ui_window.ok_or("无法打开分享面板")?;
                    let mut presenter: Retained<AnyObject> = msg_send![&*ui_window, rootViewController];
                    loop {
                        let next: Option<Retained<AnyObject>> = msg_send![&*presenter, presentedViewController];
                        match next { Some(next) => presenter = next, None => break }
                    }
                    let url = NSURL::fileURLWithPath(&NSString::from_str(&path.to_string_lossy()));
                    let items = NSArray::from_slice(&[&*url]);
                    let class = AnyClass::get(c"UIActivityViewController").ok_or("无法打开分享面板")?;
                    let allocated: *mut AnyObject = msg_send![class, alloc];
                    let sheet: *mut AnyObject = msg_send![allocated, initWithActivityItems: &*items, applicationActivities: std::ptr::null::<AnyObject>()];
                    let sheet = Retained::from_raw(sheet).ok_or("无法打开分享面板")?;
                    let popover: Option<Retained<AnyObject>> = msg_send![&*sheet, popoverPresentationController];
                    if let Some(popover) = popover {
                        let _: () = msg_send![&*popover, setSourceView: view];
                        let bounds: objc2_foundation::NSRect = msg_send![view, bounds];
                        let _: () = msg_send![&*popover, setSourceRect: bounds];
                    }
                    let _: () = msg_send![&*presenter, presentViewController: &*sheet, animated: true, completion: std::ptr::null::<AnyObject>()];
                    Ok::<(), &str>(())
                })()
            };
            let _ = tx.send(result.map_err(str::to_string));
        }).map_err(|_| "无法打开分享面板")?;
        rx.await.map_err(|_| "无法打开分享面板")?
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn download_requests_cannot_escape_github_endpoints() {
        assert_eq!(
            download_path("a", "b", "artifact", 7).unwrap(),
            "https://api.github.com/repos/a/b/actions/artifacts/7/zip"
        );
        for owner in ["..", "a/b", "a?x", "a b", ""] {
            assert!(download_path(owner, "b", "job", 1).is_err());
        }
        assert!(download_path("a", "b", "anything", 1).is_err());
        assert!(download_path("a", "b", "job", 0).is_err());
        assert!(checked_location("http://example.com/a").is_err());
        assert!(checked_location("https://user:password@example.com/a").is_err());
        assert!(checked_location("https://downloads.example.com/signed?signature=x").is_ok());
    }
}

#[cfg(test)]
mod response_tests {
    use super::*;
    use std::{
        io::{Read, Write},
        net::TcpListener,
        sync::atomic::{AtomicU64, Ordering},
    };
    static ID: AtomicU64 = AtomicU64::new(0);
    async fn response(raw: &'static [u8]) -> reqwest::Response {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = Vec::new();
            let mut byte = [0];
            while !request.ends_with(b"\r\n\r\n") {
                if stream.read(&mut byte).unwrap() == 0 {
                    break;
                }
                request.push(byte[0]);
            }
            stream.write_all(raw).unwrap();
        });
        reqwest::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .unwrap()
            .get(format!("http://{address}/asset"))
            .send()
            .await
            .unwrap()
    }
    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "gitpulse-download-test-{}-{}",
            std::process::id(),
            ID.fetch_add(1, Ordering::Relaxed)
        ))
    }
    #[test]
    fn names_fit_byte_limits_without_losing_extensions() {
        for name in [
            format!("{}.zip", "a".repeat(300)),
            format!("{}.tar.gz", "测试".repeat(100)),
            format!("{}.apk", "🐙".repeat(160)),
        ] {
            let safe = safe_name(&name, u64::MAX);
            assert!(safe.len() <= 200, "filename must fit Linux and Android byte limits");
            assert_eq!(safe.rsplit_once('.').unwrap().1, name.rsplit_once('.').unwrap().1);
            assert!(safe.starts_with("asset-18446744073709551615-"));
        }
        assert_eq!(safe_name("release-v1.zip", 7), "asset-7-release-v1.zip");
        assert_eq!(safe_name("/\\. \n", 7), "asset-7-download");
        assert!(safe_name(&format!("name.{}", "x".repeat(300)), 7).len() <= 200);
    }
    #[tokio::test]
    async fn saves_direct_binary_response_and_sanitizes_filename() {
        let root = root();
        let response = response(b"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\n\x00\x01\xffZ").await;
        let name = safe_name("../../CON.exe\n", 7);
        assert!(!name.contains('/'));
        assert!(!name.contains('\n'));
        let file = save_attachment(response, &root, &name, 10).await.unwrap();
        assert_eq!(std::fs::read(file).unwrap(), b"\x00\x01\xffZ");
        std::fs::remove_dir_all(root).unwrap();
    }
    #[tokio::test]
    async fn accepts_signed_redirect_without_following_it() {
        let response = response(b"HTTP/1.1 302 Found\r\nLocation: https://downloads.example.com/asset?signature=test\r\nContent-Length: 0\r\n\r\n").await;
        assert_eq!(
            redirect_location(&response).unwrap().host_str(),
            Some("downloads.example.com")
        );
    }
    #[tokio::test]
    async fn rejects_errors_and_missing_location() {
        for raw in [
            &b"HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n"[..],
            &b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n"[..],
            &b"HTTP/1.1 302 Found\r\nContent-Length: 0\r\n\r\n"[..],
        ] {
            assert!(redirect_location(&response(raw).await).is_err());
        }
    }
    #[tokio::test]
    async fn removes_partial_files_on_disconnect_and_stream_size_overflow() {
        for raw in [
            &b"HTTP/1.1 200 OK\r\nContent-Length: 10\r\n\r\nabc"[..],
            &b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n6\r\nabcdef\r\n6\r\nghijkl\r\n0\r\n\r\n"[..],
        ] {
            let root = root();
            assert!(save_attachment(response(raw).await, &root, "test.bin", 10).await.is_err());
            assert_eq!(std::fs::read_dir(&root).unwrap().count(), 0);
            std::fs::remove_dir_all(root).unwrap();
        }
    }
    #[tokio::test]
    async fn rejects_declared_oversize_before_creating_file() {
        let root = root();
        let response = response(b"HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\n").await;
        assert!(save_attachment(response, &root, "test.bin", 10)
            .await
            .is_err());
        assert!(!root.exists());
    }
}
