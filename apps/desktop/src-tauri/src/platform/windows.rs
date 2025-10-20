use std::io;
use tauri::AppHandle;
use winreg::enums::HKEY_CURRENT_USER;
use winreg::RegKey;

const APP_REGISTRATION_NAME: &str = "Open With Browser";
const CLIENT_KEY_PATH: &str = "Software\\Clients\\StartMenuInternet\\OpenWithBrowser";
const REGISTERED_APPLICATIONS_KEY: &str = "Software\\RegisteredApplications";
const PROTOCOL_CLASS_KEY: &str = "Software\\Classes\\OpenWithBrowserURL";

pub fn register(_app: &AppHandle) -> Result<(), String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe_path
        .to_str()
        .ok_or_else(|| "Executable path contains invalid UTF-8 characters".to_string())?;
    let command_value = format!("\"{exe_str}\" \"%1\"");
    let icon_value = format!("\"{exe_str}\",0");

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let (client_key, _) = hkcu
        .create_subkey(CLIENT_KEY_PATH)
        .map_err(map_registry_error)?;
    client_key
        .set_value("", &APP_REGISTRATION_NAME)
        .map_err(map_registry_error)?;
    client_key
        .set_value("LocalizedString", &APP_REGISTRATION_NAME)
        .map_err(map_registry_error)?;

    let (default_icon, _) = client_key
        .create_subkey("DefaultIcon")
        .map_err(map_registry_error)?;
    default_icon
        .set_value("", &icon_value)
        .map_err(map_registry_error)?;

    let (shell_command, _) = client_key
        .create_subkey("shell\\open\\command")
        .map_err(map_registry_error)?;
    shell_command
        .set_value("", &command_value)
        .map_err(map_registry_error)?;

    let (capabilities, _) = client_key
        .create_subkey("Capabilities")
        .map_err(map_registry_error)?;
    capabilities
        .set_value("ApplicationName", &APP_REGISTRATION_NAME)
        .map_err(map_registry_error)?;
    capabilities
        .set_value(
            "ApplicationDescription",
            &"Route http and https links through Open With Browser",
        )
        .map_err(map_registry_error)?;
    let (start_menu, _) = capabilities
        .create_subkey("StartMenu")
        .map_err(map_registry_error)?;
    start_menu
        .set_value("StartMenuInternet", &"OpenWithBrowser")
        .map_err(map_registry_error)?;

    let (url_associations, _) = capabilities
        .create_subkey("URLAssociations")
        .map_err(map_registry_error)?;
    url_associations
        .set_value("http", &"OpenWithBrowserURL")
        .map_err(map_registry_error)?;
    url_associations
        .set_value("https", &"OpenWithBrowserURL")
        .map_err(map_registry_error)?;

    // Register application capabilities for Settings UI
    let (registered_apps, _) = hkcu
        .create_subkey(REGISTERED_APPLICATIONS_KEY)
        .map_err(map_registry_error)?;
    registered_apps
        .set_value(
            APP_REGISTRATION_NAME,
            &format!("{CLIENT_KEY_PATH}\\Capabilities"),
        )
        .map_err(map_registry_error)?;

    let (class_key, _) = hkcu
        .create_subkey(PROTOCOL_CLASS_KEY)
        .map_err(map_registry_error)?;
    class_key
        .set_value("", &"Open With Browser URL")
        .map_err(map_registry_error)?;
    class_key
        .set_value("URL Protocol", &"")
        .map_err(map_registry_error)?;
    class_key
        .set_value("FriendlyTypeName", &"Open With Browser URL")
        .map_err(map_registry_error)?;

    let (class_icon, _) = class_key
        .create_subkey("DefaultIcon")
        .map_err(map_registry_error)?;
    class_icon
        .set_value("", &icon_value)
        .map_err(map_registry_error)?;

    let (class_command, _) = class_key
        .create_subkey("shell\\open\\command")
        .map_err(map_registry_error)?;
    class_command
        .set_value("", &command_value)
        .map_err(map_registry_error)?;

    Ok(())
}

fn map_registry_error(err: io::Error) -> String {
    err.to_string()
}
