use crate::preferences::PreferencesState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::async_runtime::{self, RwLock};
use tauri::{Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserDescriptor {
    pub name: String,
    #[serde(default)]
    pub profile: Option<String>,
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
    pub profile: Option<String>,
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
        {
            let mut guard = self.inner.write().await;
            guard.active = Some(link.clone());
        }
        app_handle
            .emit("routing://incoming", link.clone())
            .map_err(|e| e.to_string())?;

        if let Some(prefs) = app_handle.try_state::<PreferencesState>() {
            if let Some(fallback) = prefs.fallback().await {
                let decision = LaunchDecision {
                    id: link.id.clone(),
                    url: link.url.clone(),
                    browser: fallback.browser.clone(),
                    profile: fallback.profile.clone(),
                    persist: PersistChoice::Always,
                    decided_at: None,
                    source_app: link.source_app.clone(),
                    contact_name: link.contact_name.clone(),
                };

                if let Err(err) = self.resolve(app_handle, decision).await {
                    eprintln!("automatic fallback failed: {err}");
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

            let open_result = app
                .opener()
                .open_url(launch_event.url.clone(), None::<&str>);

            let status = match open_result {
                Ok(_) => LaunchState::Launched,
                Err(err) => {
                    let _ = app.emit(
                        "routing://error",
                        RoutingError {
                            id: launch_event.id.clone(),
                            browser: launch_event.browser.clone(),
                            message: err.to_string(),
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

impl Default for RoutingService {
    fn default() -> Self {
        Self::new()
    }
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
            profile: Some("Workspace".to_string()),
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
