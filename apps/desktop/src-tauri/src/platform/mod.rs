#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

use tauri::AppHandle;
use tauri_plugin_os::OsType;

pub fn register_as_browser(app: &AppHandle) -> Result<(), String> {
    match tauri_plugin_os::type_() {
        #[cfg(target_os = "windows")]
        OsType::Windows => windows::register(app),
        #[cfg(target_os = "macos")]
        OsType::Macos => macos::register(app),
        #[cfg(target_os = "linux")]
        OsType::Linux => linux::register(app),
        _ => Ok(()),
    }
}
