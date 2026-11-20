use serde::Serialize;
use std::time::Duration;

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
}

/// Credentials are sent once to api.github.com. Signed downloads use a new, unauthenticated request.
#[tauri::command]
pub async fn github_download(
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
        .timeout(Duration::from_secs(30))
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
    if !response.status().is_redirection() {
        return Err(format!(
            "GitHub 下载请求失败（{}）",
            response.status().as_u16()
        ));
    }
    let location = response
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|v| v.to_str().ok())
        .ok_or("下载链接不可用")?;
    let location = checked_location(location)?;
    if kind != "job" {
        return Ok(DownloadResult {
            url: Some(location.to_string()),
            text: None,
            truncated: false,
        });
    }
    let mut response = client
        .get(location)
        .send()
        .await
        .map_err(|_| "日志下载失败，请重试".to_string())?
        .error_for_status()
        .map_err(|_| "日志下载失败，请重试".to_string())?;
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
            });
        }
    }
    Ok(DownloadResult {
        url: None,
        text: Some(String::from_utf8_lossy(&bytes).into_owned()),
        truncated: false,
    })
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
