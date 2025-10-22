use core_foundation::base::TCFType;
use core_foundation::string::CFString;
use core_foundation::url::{kCFURLPOSIXPathStyle, CFURL, CFURLRef};
use std::path::Path;
use tauri::{AppHandle, Manager};

#[link(name = "CoreServices", kind = "framework")]
extern "C" {
    fn LSRegisterURL(in_url: CFURLRef, in_update: bool) -> i32;
}

pub fn register(app: &AppHandle) -> Result<(), String> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        if let Some(bundle_path) = resource_dir.parent().and_then(|p| p.parent()) {
            try_register_path(bundle_path)?;
            return Ok(());
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
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
    let url = CFURL::from_file_system_path(cf_path, kCFURLPOSIXPathStyle, is_directory);
    let status = unsafe { LSRegisterURL(url.as_concrete_TypeRef(), true) };

    if status != 0 {
        return Err(format!(
            "LaunchServices registration returned status code {status}"
        ));
    }

    Ok(())
}
