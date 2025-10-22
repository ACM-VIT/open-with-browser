use std::fs;
use std::io;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

const DESKTOP_FILE_NAME: &str = "open-with-browser.desktop";

pub fn register(_app: &AppHandle) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe_path
        .to_str()
        .ok_or_else(|| "Executable path contains invalid UTF-8 characters".to_string())?;

    let applications_dir = resolve_applications_dir()?;
    fs::create_dir_all(&applications_dir).map_err(map_fs_error)?;

    let desktop_path = applications_dir.join(DESKTOP_FILE_NAME);
    let desktop_entry = format!(
        "[Desktop Entry]\n\
Version=1.0\n\
Type=Application\n\
Name=Open With Browser\n\
Comment=Route http and https links through Open With Browser\n\
Exec=\"{exe_str}\" %u\n\
Terminal=false\n\
Categories=Network;WebBrowser;\n\
MimeType=x-scheme-handler/http;x-scheme-handler/https;\n\
",
    );

    fs::write(&desktop_path, desktop_entry).map_err(map_fs_error)?;

    if which::which("xdg-mime").is_ok() {
        let _ = Command::new("xdg-mime")
            .args(["default", DESKTOP_FILE_NAME, "x-scheme-handler/http"])
            .status();
        let _ = Command::new("xdg-mime")
            .args(["default", DESKTOP_FILE_NAME, "x-scheme-handler/https"])
            .status();
    }

    if which::which("update-desktop-database").is_ok() {
        let _ = Command::new("update-desktop-database")
            .arg(applications_dir)
            .status();
    }

    Ok(())
}

fn resolve_applications_dir() -> Result<PathBuf, String> {
    if let Some(xdg_home) = std::env::var_os("XDG_DATA_HOME") {
        if !xdg_home.is_empty() {
            return Ok(PathBuf::from(xdg_home).join("applications"));
        }
    }

    dirs::data_dir()
        .map(|p| p.join("applications"))
        .ok_or_else(|| "Unable to determine XDG data directory".to_string())
}

fn map_fs_error(err: io::Error) -> String {
    err.to_string()
}
