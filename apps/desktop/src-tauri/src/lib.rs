// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Serialize)]
struct ResolveLinkResponse {
    matched: bool,
}

#[tauri::command]
fn resolve_link(url: &str) -> ResolveLinkResponse {
    // Parse URL (stub implementation - always returns matched=false)
    // For now, just accept the URL string and return false
    ResolveLinkResponse { matched: false }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, resolve_link])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
