#[cfg(target_os = "android")]
mod android_tls;
mod github_oauth;
mod safe_area;
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
        .invoke_handler(tauri::generate_handler![
            greet,
            github_oauth::github_oauth_request,
            github_oauth::open_github_authorization,
            safe_area::configure_safe_area,
            secure_storage::read_auth_vault,
            secure_storage::write_auth_vault,
            secure_storage::clear_auth_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
