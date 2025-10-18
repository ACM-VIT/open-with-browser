#[tauri::command]
pub fn get_available_browser() {
    get_browsers();
}