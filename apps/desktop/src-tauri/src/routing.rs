use crate::preferences::PreferencesState;
use chrono::Utc;
use crowser::browser::{get_all_existing_browsers, get_browser_path};
use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use tauri::async_runtime::{self, RwLock};
use tauri::{Emitter, Manager, State};
use tokio::time::{sleep, Duration};
use url::Url;
use uuid::Uuid;

#[cfg(any(target_os = "linux", target_os = "macos"))]
use dirs::{config_dir, home_dir};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserDescriptor {
    pub name: String,
    #[serde(default)]
    pub profile_label: Option<String>,
    #[serde(default)]
    pub profile_directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncomingLink {
    pub id: String,
    pub url: String,
    pub source_app: String,
    #[serde(default)]
    pub source_context: Option<String>,
    #[serde(default)]
    pub contact_name: Option<String>,
    #[serde(default)]
    pub preview: Option<String>,
    #[serde(default)]
    pub recommended_browser: Option<BrowserDescriptor>,
    #[serde(default)]
    pub arrived_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchDecision {
    pub id: String,
    pub url: String,
    pub browser: String,
    #[serde(default)]
    pub profile_label: Option<String>,
    #[serde(default)]
    pub profile_directory: Option<String>,
    pub persist: PersistChoice,
    #[serde(default)]
    pub decided_at: Option<String>,
    pub source_app: String,
    #[serde(default)]
    pub contact_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PersistChoice {
    JustOnce,
    Always,
}

impl Default for PersistChoice {
    fn default() -> Self {
        PersistChoice::JustOnce
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct RoutingSnapshot {
    pub active: Option<IncomingLink>,
    pub history: Vec<LaunchDecision>,
}

#[derive(Clone)]
pub struct RoutingService {
    inner: Arc<RwLock<RoutingState>>,
}

#[derive(Default)]
struct RoutingState {
    active: Option<IncomingLink>,
    history: Vec<LaunchDecision>,
}

impl RoutingService {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(RoutingState::default())),
        }
    }

    pub async fn snapshot(&self) -> RoutingSnapshot {
        let guard = self.inner.read().await;
        RoutingSnapshot {
            active: guard.active.clone(),
            history: guard.history.clone(),
        }
    }

    pub async fn register_incoming(
        &self,
        app_handle: &tauri::AppHandle,
        mut link: IncomingLink,
    ) -> Result<IncomingLink, String> {
        if link.id.is_empty() {
            link.id = Uuid::new_v4().to_string();
        }
        link.url = normalize_url(&link.url);
        append_log(
            app_handle,
            &format!(
                "Incoming link registered: id={} url={} source_app={}",
                link.id, link.url, link.source_app
            ),
        );
        {
            let mut guard = self.inner.write().await;
            guard.active = Some(link.clone());
        }
        app_handle
            .emit("routing://incoming", link.clone())
            .map_err(|e| e.to_string())?;

        if let Some(prefs) = app_handle.try_state::<PreferencesState>() {
            if let Some(fallback) = prefs.fallback().await {
                let profile_label = fallback
                    .profile
                    .as_ref()
                    .and_then(|p| p.label.clone())
                    .filter(|s| !s.is_empty());
                let profile_directory = fallback
                    .profile
                    .as_ref()
                    .and_then(|p| p.directory.clone())
                    .filter(|s| !s.is_empty());
                let decision = LaunchDecision {
                    id: link.id.clone(),
                    url: link.url.clone(),
                    browser: fallback.browser.clone(),
                    profile_label,
                    profile_directory,
                    persist: PersistChoice::Always,
                    decided_at: None,
                    source_app: link.source_app.clone(),
                    contact_name: link.contact_name.clone(),
                };

                if let Err(err) = self.resolve(app_handle, decision).await {
                    eprintln!("automatic fallback failed: {err}");
                    append_log(
                        app_handle,
                        &format!("Automatic fallback failed for link id={}: {}", link.id, err),
                    );
                }
            }
        }

        Ok(link)
    }

    pub async fn resolve(
        &self,
        app_handle: &tauri::AppHandle,
        mut decision: LaunchDecision,
    ) -> Result<LaunchDecision, String> {
        decision.url = normalize_url(&decision.url);

        if decision.url.is_empty() {
            append_log(
                app_handle,
                &format!(
                    "Launch decision rejected: empty or invalid URL for id={}",
                    decision.id
                ),
            );
            return Err("Link does not contain a valid URL to open.".to_string());
        }

        if decision.decided_at.is_none() {
            decision.decided_at = Some(current_timestamp());
        }

        {
            let mut guard = self.inner.write().await;
            guard.active = None;
            guard.history.insert(0, decision.clone());
            guard.history.truncate(50);
        }

        app_handle
            .emit("routing://decision", decision.clone())
            .map_err(|e| e.to_string())?;

        let app = app_handle.clone();
        let launch_event = decision.clone();
        async_runtime::spawn(async move {
            let _ = app.emit(
                "routing://status",
                RoutingStatus {
                    id: launch_event.id.clone(),
                    browser: launch_event.browser.clone(),
                    status: LaunchState::Launching,
                },
            );

            let Some(browser_path) = resolve_browser_path(&launch_event.browser) else {
                let message = format!(
                    "No executable found for browser '{}' while handling id={}.",
                    launch_event.browser, launch_event.id
                );
                append_log(&app, &message);
                let _ = app.emit(
                    "routing://error",
                    RoutingError {
                        id: launch_event.id.clone(),
                        browser: launch_event.browser.clone(),
                        message,
                    },
                );
                let _ = app.emit(
                    "routing://status",
                    RoutingStatus {
                        id: launch_event.id.clone(),
                        browser: launch_event.browser.clone(),
                        status: LaunchState::Failed,
                    },
                );
                return;
            };

            let path_display = browser_path.display().to_string();
            let profile_info = match (
                &launch_event.profile_label,
                &launch_event.profile_directory,
            ) {
                (Some(label), Some(directory)) => {
                    format!(" profile_label={label} profile_directory={directory}")
                }
                (Some(label), None) => format!(" profile_label={label}"),
                (None, Some(directory)) => format!(" profile_directory={directory}"),
                _ => String::new(),
            };
            append_log(
                &app,
                &format!(
                    "Launching browser for id={} url={} via {} ({}){}",
                    launch_event.id,
                    launch_event.url,
                    launch_event.browser,
                    path_display,
                    profile_info
                ),
            );

            let browser_name = launch_event.browser.clone();
            let url_to_open = launch_event.url.clone();
            let profile_directory = launch_event.profile_directory.clone();
            let app_for_errors = app.clone();

            let launch_result = async_runtime::spawn_blocking(move || {
                launch_with_browser(
                    browser_path,
                    &browser_name,
                    &url_to_open,
                    profile_directory,
                )
            })
            .await;

            let status = match launch_result {
                Ok(Ok(())) => {
                    append_log(
                        &app,
                        &format!(
                            "Launch succeeded for id={} url={}",
                            launch_event.id, launch_event.url
                        ),
                    );
                    LaunchState::Launched
                }
                Ok(Err(err)) => {
                    append_log(
                        &app,
                        &format!(
                            "Launch failed for id={} url={}: {}",
                            launch_event.id, launch_event.url, err
                        ),
                    );
                    let _ = app.emit(
                        "routing://error",
                        RoutingError {
                            id: launch_event.id.clone(),
                            browser: launch_event.browser.clone(),
                            message: err,
                        },
                    );
                    LaunchState::Failed
                }
                Err(join_err) => {
                    let message = format!(
                        "Launch task panicked for id={} url={}: {}",
                        launch_event.id, launch_event.url, join_err
                    );
                    append_log(&app, &message);
                    let _ = app_for_errors.emit(
                        "routing://error",
                        RoutingError {
                            id: launch_event.id.clone(),
                            browser: launch_event.browser.clone(),
                            message,
                        },
                    );
                    LaunchState::Failed
                }
            };

            sleep(Duration::from_millis(200)).await;

            let _ = app.emit(
                "routing://status",
                RoutingStatus {
                    id: launch_event.id.clone(),
                    browser: launch_event.browser.clone(),
                    status,
                },
            );
        });

        Ok(decision)
    }

    pub async fn clear_active(&self) {
        let mut guard = self.inner.write().await;
        guard.active = None;
    }
}

fn normalize_url(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if Url::parse(trimmed).is_ok() {
        return trimmed.to_string();
    }

    let candidate = format!(
        "https://{}",
        trimmed
            .trim_start_matches("https://")
            .trim_start_matches("http://")
    );

    if Url::parse(&candidate).is_ok() {
        candidate
    } else {
        trimmed.to_string()
    }
}

impl Default for RoutingService {
    fn default() -> Self {
        Self::new()
    }
}

fn resolve_browser_path(name: &str) -> Option<PathBuf> {
    let needle = normalize_browser_key(name);
    for browser in get_all_existing_browsers() {
        if normalize_browser_key(browser.name) == needle {
            if let Some(path) = get_browser_path(&browser) {
                return Some(path);
            }
        }
    }
    None
}

fn normalize_browser_key(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

fn launch_with_browser(
    path: PathBuf,
    browser_name: &str,
    url: &str,
    profile_directory: Option<String>,
) -> Result<(), String> {
    let mut command = Command::new(&path);

    if let Some(profile_dir) = profile_directory.as_deref() {
        add_profile_args(&mut command, browser_name, profile_dir);
    }

    if let Some(user_data_dir) = browser_user_data_dir(browser_name) {
        command.arg(format!("--user-data-dir={}", user_data_dir.display()));
    }

    command.arg(url);

    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command.spawn().map(|_| ()).map_err(|err| err.to_string())
}

fn add_profile_args(command: &mut Command, browser_name: &str, profile: &str) {
    let trimmed = profile.trim();
    if trimmed.is_empty() {
        return;
    }

    let key = normalize_browser_key(browser_name);
    match key.as_str() {
        k if matches!(
            k,
            "chrome"
                | "chromebeta"
                | "chromedev"
                | "chromecanary"
                | "chromium"
                | "edge"
                | "edgebeta"
                | "edgedev"
                | "edgecanary"
                | "brave"
                | "vivaldi"
                | "thorium"
        ) => {
            command.arg(format!("--profile-directory={trimmed}"));
        }
        k if matches!(k, "firefox" | "firefoxbeta" | "waterfox") => {
            command.args(["-P", trimmed]);
        }
        _ => {}
    }
}

fn browser_user_data_dir(browser_name: &str) -> Option<PathBuf> {
    let key = normalize_browser_key(browser_name);

    #[cfg(target_os = "windows")]
    {
        let base = env::var_os("LOCALAPPDATA")?;
        let mut path = PathBuf::from(base);
        match key.as_str() {
            "chrome" => {
                path.push("Google");
                path.push("Chrome");
                path.push("User Data");
                Some(path)
            }
            "chromebeta" => {
                path.push("Google");
                path.push("Chrome Beta");
                path.push("User Data");
                Some(path)
            }
            "chromedev" => {
                path.push("Google");
                path.push("Chrome Dev");
                path.push("User Data");
                Some(path)
            }
            "chromecanary" => {
                path.push("Google");
                path.push("Chrome SxS");
                path.push("User Data");
                Some(path)
            }
            "chromium" => {
                path.push("Chromium");
                path.push("User Data");
                Some(path)
            }
            "edge" => {
                path.push("Microsoft");
                path.push("Edge");
                path.push("User Data");
                Some(path)
            }
            "edgebeta" => {
                path.push("Microsoft");
                path.push("Edge Beta");
                path.push("User Data");
                Some(path)
            }
            "edgedev" => {
                path.push("Microsoft");
                path.push("Edge Dev");
                path.push("User Data");
                Some(path)
            }
            "edgecanary" => {
                path.push("Microsoft");
                path.push("Edge SxS");
                path.push("User Data");
                Some(path)
            }
            "brave" => {
                path.push("BraveSoftware");
                path.push("Brave-Browser");
                path.push("User Data");
                Some(path)
            }
            "vivaldi" => {
                path.push("Vivaldi");
                path.push("User Data");
                Some(path)
            }
            "thorium" => {
                path.push("Thorium");
                path.push("User Data");
                Some(path)
            }
            _ => None,
        }
    }

    #[cfg(target_os = "linux")]
    {
        let mut path = config_dir()?;
        match key.as_str() {
            "chrome" | "chromium" => {
                path.push("google-chrome");
                Some(path)
            }
            "brave" => {
                path.push("BraveSoftware");
                path.push("Brave-Browser");
                Some(path)
            }
            "vivaldi" => {
                path.push("vivaldi");
                Some(path)
            }
            _ => None,
        }
    }

    #[cfg(target_os = "macos")]
    {
        let mut path = home_dir()?;
        match key.as_str() {
            "chrome" => {
                path.push("Library");
                path.push("Application Support");
                path.push("Google");
                path.push("Chrome");
                Some(path)
            }
            "brave" => {
                path.push("Library");
                path.push("Application Support");
                path.push("BraveSoftware");
                path.push("Brave-Browser");
                Some(path)
            }
            "edge" => {
                path.push("Library");
                path.push("Application Support");
                path.push("Microsoft Edge");
                Some(path)
            }
            _ => None,
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        let _ = browser_name;
        None
    }
}

fn append_log(_app: &tauri::AppHandle, message: &str) {
    let timestamp = Utc::now().to_rfc3339();
    let entry = format!("[{timestamp}] {message}\n");
    print!("{entry}");
}

#[derive(Debug, Clone, Serialize)]
pub struct RoutingStatus {
    pub id: String,
    pub browser: String,
    pub status: LaunchState,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum LaunchState {
    Launching,
    Launched,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
pub struct RoutingError {
    pub id: String,
    pub browser: String,
    pub message: String,
}

fn current_timestamp() -> String {
    use chrono::Utc;
    Utc::now().to_rfc3339()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulatedLinkPayload {
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub source_app: Option<String>,
    #[serde(default)]
    pub contact_name: Option<String>,
    #[serde(default)]
    pub source_context: Option<String>,
    #[serde(default)]
    pub preview: Option<String>,
}

pub async fn simulate_link_payload(payload: Option<SimulatedLinkPayload>) -> IncomingLink {
    let data = payload.unwrap_or_default();
    let url = data
        .url
        .unwrap_or_else(|| "https://example.com/background-launch".to_string());
    let source_app = data
        .source_app
        .unwrap_or_else(|| "WhatsApp Desktop".to_string());
    let contact_name = data
        .contact_name
        .unwrap_or_else(|| "Automation Bot".to_string());

    IncomingLink {
        id: Uuid::new_v4().to_string(),
        url: url.clone(),
        source_app,
        source_context: data
            .source_context
            .or_else(|| Some("Auto-generated hand-off".to_string())),
        contact_name: Some(contact_name),
        preview: data
            .preview
            .or_else(|| Some("Shared link detected.".to_string())),
        recommended_browser: Some(BrowserDescriptor {
            name: "Arc".to_string(),
            profile_label: Some("Workspace".to_string()),
            profile_directory: None,
        }),
        arrived_at: Some(current_timestamp()),
    }
}

impl Default for SimulatedLinkPayload {
    fn default() -> Self {
        Self {
            url: None,
            source_app: None,
            contact_name: None,
            source_context: None,
            preview: None,
        }
    }
}

pub type RoutingStateHandle<'a> = State<'a, RoutingService>;
