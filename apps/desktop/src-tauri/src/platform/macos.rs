use core_foundation::base::TCFType;
use core_foundation::string::CFString;
use core_foundation::url::{kCFURLPOSIXPathStyle, CFURL};
use std::path::Path;
use tauri::AppHandle;

#[link(name = "CoreServices", kind = "framework")]
extern "C" {
    fn LSRegisterURL(in_url: core_foundation::sys::url::CFURLRef, in_update: bool) -> i32;
}

pub fn register(app: &AppHandle) -> Result<(), String> {
    if let Some(bundle_path) = app.path_resolver().app_bundle_path() {
        try_register_path(&bundle_path)?;
    } else if let Ok(exe_path) = std::env::current_exe() {
        try_register_path(&exe_path)?;
    }

    Ok(())
}

fn try_register_path(path: &Path) -> Result<(), String> {
    let is_directory = path.is_dir();
    let path_str = path.to_str().ok_or_else(|| {
        "Failed to resolve application path for LaunchServices registration".to_string()
    })?;
    let cf_path = CFString::new(path_str);
    let url = CFURL::from_file_system_path(&cf_path, kCFURLPOSIXPathStyle, is_directory);
    let status = unsafe { LSRegisterURL(url.as_concrete_TypeRef(), true) };

    if status != 0 {
        return Err(format!(
            "LaunchServices registration returned status code {status}"
        ));
    }

    Ok(())
}
