#[cfg(target_os = "android")]
mod android_tls;
mod github_oauth;
mod github_downloads;
mod contribution_widgets;
mod safe_area;
mod mobile_navigation;
mod secure_storage;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(contribution_widgets::init())
        .plugin(mobile_navigation::init())
        .on_window_event(|_window, _event| {
            #[cfg(mobile)]
            {
                use tauri::Manager;
                let active = match _event {
                    tauri::WindowEvent::Suspended => false,
                    tauri::WindowEvent::Resumed => true,
                    _ => return,
                };
                if let Some(webview) = _window.app_handle().get_webview_window(_window.label()) {
                    // Keep the flag and event in the same evaluation, including
                    // when WebView callbacks are queued until the app resumes.
                    let _ = webview.eval(format!(
                        "window.__GITPULSE_APP_ACTIVE__={active};window.dispatchEvent(new Event('gitpulse:app-state'));"
                    ));
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            contribution_widgets::contribution_widget_status,
            contribution_widgets::sync_contribution_widget,
            contribution_widgets::pin_contribution_widget,
            github_oauth::github_oauth_request,
            github_downloads::github_download,
            github_oauth::open_github_authorization,
            safe_area::configure_safe_area,
            mobile_navigation::set_navigation_gestures,
            secure_storage::read_auth_vault,
            secure_storage::write_auth_vault,
            secure_storage::clear_auth_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
