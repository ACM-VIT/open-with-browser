use crate::{
    browser_details::{
        get_browsers, get_chrome_profiles, get_firefox_profiles, parse_browser_kind, Browsers,
        ProfileDescriptor,
    },
    diagnostics::{DiagnosticEntry, DiagnosticsState},
    platform,
    preferences::{FallbackPreference, PreferencesState, ProfilePreference},
    routing::{
        simulate_link_payload, IncomingLink, LaunchDecision, RoutingSnapshot, RoutingStateHandle,
    },
};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_os::OsType;

fn map_error(err: Box<dyn std::error::Error>) -> String {
    err.to_string()
}

#[cfg(target_os = "windows")]
fn current_http_handler_windows() -> Result<String, String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    const USER_CHOICE_KEY: &str =
        "Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice";

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey(USER_CHOICE_KEY)
        .map_err(|e| e.to_string())?;
    key.get_value::<String, _>("ProgId")
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn current_http_handler_macos() -> Result<String, String> {
    use core_foundation::base::TCFType;
    use core_foundation::string::CFString;

    #[link(name = "CoreServices", kind = "framework")]
    extern "C" {
        fn LSCopyDefaultHandlerForURLScheme(
            scheme: core_foundation::sys::string::CFStringRef,
        ) -> core_foundation::sys::string::CFStringRef;
    }

    let scheme = CFString::new("http");
    let result = unsafe { LSCopyDefaultHandlerForURLScheme(scheme.as_concrete_TypeRef()) };
    if result.is_null() {
        return Err("LaunchServices did not return a handler".to_string());
    }

    let handler = unsafe { CFString::wrap_under_create_rule(result) };
    Ok(handler.to_string())
}

#[cfg(target_os = "linux")]
fn current_http_handler_linux() -> Result<String, String> {
    let output = Command::new("xdg-settings")
        .args(["get", "default-web-browser"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(format!("xdg-settings exited with status {}", output.status));
    }

    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        return Err("xdg-settings returned an empty value".to_string());
    }

    Ok(value)
}

#[tauri::command]
pub fn get_available_browsers() -> Vec<String> {
    get_browsers()
}

#[tauri::command]
pub fn get_profiles(browser_kind: String) -> Result<Vec<ProfileDescriptor>, String> {
    let kind = parse_browser_kind(browser_kind.as_str())
        .ok_or_else(|| format!("Unsupported browser: {browser_kind}"))?;

    match kind {
        Browsers::Chrome | Browsers::Edge | Browsers::Brave => {
            get_chrome_profiles(kind).map_err(map_error)
        }
        Browsers::FireFox => get_firefox_profiles().map_err(map_error),
        Browsers::Safari => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn routing_snapshot(state: RoutingStateHandle<'_>) -> Result<RoutingSnapshot, String> {
    Ok(state.snapshot().await)
}

#[tauri::command]
pub async fn register_incoming_link(
    app_handle: AppHandle,
    state: RoutingStateHandle<'_>,
    link: IncomingLink,
) -> Result<IncomingLink, String> {
    state.register_incoming(&app_handle, link).await
}

#[tauri::command]
pub async fn resolve_incoming_link(
    app_handle: AppHandle,
    state: RoutingStateHandle<'_>,
    decision: LaunchDecision,
) -> Result<LaunchDecision, String> {
    state.resolve(&app_handle, decision).await
}

#[tauri::command]
pub async fn simulate_incoming_link(
    app_handle: AppHandle,
    state: RoutingStateHandle<'_>,
    payload: Option<crate::routing::SimulatedLinkPayload>,
) -> Result<IncomingLink, String> {
    let link = simulate_link_payload(payload).await;
    state.register_incoming(&app_handle, link).await
}

#[tauri::command]
pub async fn is_default_browser(app_handle: AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    let _ = &app_handle;

    match tauri_plugin_os::type_() {
        #[cfg(target_os = "windows")]
        OsType::Windows => {
            let handler = current_http_handler_windows()?;
            Ok(handler.eq_ignore_ascii_case("OpenWithBrowserURL"))
        }
        #[cfg(target_os = "macos")]
        OsType::Macos => {
            let handler = current_http_handler_macos()?;
            let bundle_id = app_handle.config().identifier.clone();
            Ok(handler == bundle_id)
        }
        #[cfg(target_os = "linux")]
        OsType::Linux => {
            let handler = current_http_handler_linux()?;
            let app_identifier = app_handle.config().identifier.clone();
            let expected = format!("{}.desktop", app_identifier.replace('-', "_"));
            Ok(handler == expected)
        }
        _ => Ok(false),
    }
}

#[tauri::command]
pub async fn open_default_browser_settings(_app_handle: AppHandle) -> Result<(), String> {
    match tauri_plugin_os::type_() {
        #[cfg(target_os = "windows")]
        OsType::Windows => Command::new("explorer.exe")
            .arg("ms-settings:defaultapps")
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string()),
        #[cfg(target_os = "macos")]
        OsType::Macos => Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.general?DefaultWebBrowser")
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string()),
        #[cfg(target_os = "linux")]
        OsType::Linux => {
            let attempts = [
                (
                    "xdg-settings",
                    vec!["set", "default-web-browser", "open-with-browser.desktop"],
                ),
                ("gnome-control-center", vec!["default-applications"]),
                ("xdg-open", vec!["about:preferences"]),
            ];

            for (cmd, args) in attempts {
                if which::which(cmd).is_ok()
                    && std::process::Command::new(cmd).args(&args).spawn().is_ok()
                {
                    return Ok(());
                }
            }

            Command::new("xdg-open")
                .arg("https://wiki.archlinux.org/title/Default_applications")
                .spawn()
                .map(|_| ())
                .map_err(|e| e.to_string())
        }
        _ => Ok(()),
    }
}

#[tauri::command]
pub async fn register_browser_handlers(app_handle: AppHandle) -> Result<(), String> {
    platform::register_as_browser(&app_handle)
}

#[derive(Debug, Serialize)]
pub struct PreferencesSnapshot {
    pub fallback: Option<FallbackPreference>,
}

#[derive(Debug, Deserialize)]
pub struct ProfileSelectionInput {
    pub label: Option<String>,
    pub directory: Option<String>,
}

#[tauri::command]
pub async fn get_preferences(app_handle: AppHandle) -> Result<PreferencesSnapshot, String> {
    if let Some(state) = app_handle.try_state::<PreferencesState>() {
        let fallback = state.fallback().await;
        Ok(PreferencesSnapshot { fallback })
    } else {
        Ok(PreferencesSnapshot { fallback: None })
    }
}

#[tauri::command]
pub async fn set_fallback_browser(
    app_handle: AppHandle,
    browser: Option<String>,
    profile: Option<ProfileSelectionInput>,
) -> Result<(), String> {
    let state = app_handle
        .try_state::<PreferencesState>()
        .ok_or_else(|| "Preferences state not initialised".to_string())?;

    match browser {
        Some(name) if !name.is_empty() => {
            state
                .set_fallback(
                    &app_handle,
                    Some(FallbackPreference {
                        browser: name,
                        profile: profile.map(|p| ProfilePreference {
                            label: p.label,
                            directory: p.directory,
                        }),
                    }),
                )
                .await
        }
        _ => state.set_fallback(&app_handle, None).await,
    }
}

#[tauri::command]
pub fn get_diagnostics(state: State<DiagnosticsState>) -> Vec<DiagnosticEntry> {
    let mut entries = state.snapshot();
    entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    entries
}

#[tauri::command]
pub fn clear_diagnostics(state: State<DiagnosticsState>) {
    state.clear();
}

#[tauri::command]
pub fn export_diagnostics(state: State<DiagnosticsState>) -> Result<String, String> {
    let entries = state.snapshot();
    let contents = entries
        .into_iter()
        .map(|entry| format!("[{}] {}", entry.timestamp, entry.message))
        .collect::<Vec<_>>()
        .join("\n");
    Ok(contents)
}
