use std::{collections::HashMap, time::Duration};
use tauri_plugin_opener::OpenerExt;

fn oauth_url(endpoint: &str) -> Result<&'static str, String> {
    match endpoint {
        "device/code" => Ok("https://github.com/login/device/code"),
        "oauth/access_token" => Ok("https://github.com/login/oauth/access_token"),
        _ => Err("不支持的 GitHub 授权请求".into()),
    }
}

#[tauri::command]
pub async fn github_oauth_request(
    endpoint: String,
    params: HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    let url = oauth_url(&endpoint)?;
    #[cfg(target_os = "android")]
    crate::android_tls::initialize()?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "无法初始化 GitHub 授权连接".to_string())?;
    client
        .post(url)
        .header("Accept", "application/json")
        .header("User-Agent", "GitPulse")
        .form(&params)
        .send()
        .await
        .map_err(|_| "无法连接 GitHub，请检查网络后重试".to_string())?
        .error_for_status()
        .map_err(|_| "GitHub 授权服务暂时不可用，请稍后重试".to_string())?
        .json()
        .await
        .map_err(|_| "GitHub 授权服务返回了无效响应".to_string())
}

#[tauri::command]
pub async fn open_github_authorization(app: tauri::AppHandle) -> Result<(), String> {
    // Mobile opener waits for an Android/iOS main-thread callback. A synchronous
    // IPC command can block that same thread, preventing the browser from opening.
    tauri::async_runtime::spawn_blocking(move || {
        app.opener()
            .open_url("https://github.com/login/device", None::<&str>)
            .map_err(|_| "无法打开浏览器，请手动访问 https://github.com/login/device".to_string())
    })
    .await
    .map_err(|_| "无法打开浏览器，请手动访问 https://github.com/login/device".to_string())?
}

#[cfg(test)]
mod tests {
    use super::oauth_url;

    #[test]
    fn only_known_github_oauth_endpoints_are_allowed() {
        assert_eq!(
            oauth_url("device/code").unwrap(),
            "https://github.com/login/device/code"
        );
        assert_eq!(
            oauth_url("oauth/access_token").unwrap(),
            "https://github.com/login/oauth/access_token"
        );
        assert!(oauth_url("https://example.com").is_err());
        assert!(oauth_url("../user").is_err());
    }
}
