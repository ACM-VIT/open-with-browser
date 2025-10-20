mod browser_details;
mod commands;
mod domain;
mod link;
mod platform;
mod preferences;
mod routing;

use commands::{
    get_available_browsers, get_preferences, get_profiles, is_default_browser,
    open_default_browser_settings, register_browser_handlers, register_incoming_link,
    resolve_incoming_link, routing_snapshot, set_fallback_browser, simulate_incoming_link,
};
#[cfg(any(target_os = "macos", target_os = "ios"))]
use link::handle_open_urls;
use link::{handle_cli_arguments, LinkSource};
use routing::RoutingService;
use tauri::Manager;
#[cfg(any(target_os = "macos", target_os = "ios"))]
use tauri::RunEvent;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let args = argv.into_iter().skip(1).collect::<Vec<_>>();
            handle_cli_arguments(&app.app_handle(), &args, LinkSource::SecondaryInstance);
        }))
        .manage(RoutingService::new())
        .setup(|app| {
            let args = std::env::args().skip(1).collect::<Vec<_>>();
            handle_cli_arguments(&app.handle(), &args, LinkSource::InitialLaunch);

            if let Err(err) = platform::register_as_browser(&app.handle()) {
                eprintln!("failed to register platform browser hooks: {err}");
            }

            match preferences::PreferencesState::load(&app.handle()) {
                Ok(state) => {
                    let _ = app.manage(state);
                }
                Err(err) => eprintln!("failed to load preferences: {err}"),
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_available_browsers,
            get_profiles,
            routing_snapshot,
            register_incoming_link,
            resolve_incoming_link,
            simulate_incoming_link,
            is_default_browser,
            open_default_browser_settings,
            register_browser_handlers,
            get_preferences,
            set_fallback_browser
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        {
            if let RunEvent::Opened { urls } = event {
                let urls = urls.iter().map(|u| u.to_string()).collect::<Vec<_>>();
                handle_open_urls(app_handle, &urls, LinkSource::OsEvent);
            }
        }
        #[cfg(not(any(target_os = "macos", target_os = "ios")))]
        {
            let _ = app_handle;
            let _ = event;
        }
    });
}
