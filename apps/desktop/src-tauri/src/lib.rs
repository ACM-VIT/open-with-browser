mod browser_details;
mod commands;
mod diagnostics;
mod domain;
mod link;
mod platform;
mod preferences;
mod routing;

use commands::{
    clear_diagnostics, export_diagnostics, get_available_browsers, get_diagnostics,
    get_preferences, get_profiles, is_default_browser, open_default_browser_settings,
    register_browser_handlers, register_incoming_link, resolve_incoming_link, routing_snapshot,
    set_fallback_browser, simulate_incoming_link,
};
#[cfg(any(target_os = "macos", target_os = "ios"))]
use link::handle_open_urls;
use link::{handle_cli_arguments, LinkSource};
use routing::RoutingService;
use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
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
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let args = argv.into_iter().skip(1).collect::<Vec<_>>();
            handle_cli_arguments(&app.app_handle(), &args, LinkSource::SecondaryInstance);
        }))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .manage(RoutingService::new())
        .manage(diagnostics::DiagnosticsState::default())
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

            let show_item = MenuItemBuilder::with_id("show", "Show window").build(app)?;
            let hide_item = MenuItemBuilder::with_id("hide", "Hide window").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&hide_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .show_menu_on_left_click(true)
                .tooltip("Open With Browser")
                .on_menu_event(|app, event: MenuEvent| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event: TrayIconEvent| match event {
                    TrayIconEvent::Click { button, button_state, .. }
                        if button == MouseButton::Left
                            && button_state == MouseButtonState::Up =>
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    TrayIconEvent::DoubleClick { .. } => {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;

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
            set_fallback_browser,
            get_diagnostics,
            clear_diagnostics,
            export_diagnostics
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
