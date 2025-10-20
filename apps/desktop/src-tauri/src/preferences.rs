use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{async_runtime::RwLock, AppHandle, Manager};

const PREFERENCES_FILE: &str = "preferences.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Preferences {
    #[serde(default)]
    pub fallback: Option<FallbackPreference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackPreference {
    pub browser: String,
    #[serde(default)]
    pub profile: Option<String>,
}

pub struct PreferencesState {
    path: PathBuf,
    inner: RwLock<Preferences>,
}

impl PreferencesState {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let base_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;

        if !base_dir.exists() {
            fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;
        }

        let path = base_dir.join(PREFERENCES_FILE);
        let prefs = read_preferences(&path)?;

        Ok(Self {
            path,
            inner: RwLock::new(prefs),
        })
    }

    pub async fn fallback(&self) -> Option<FallbackPreference> {
        let guard = self.inner.read().await;
        guard.fallback.clone()
    }

    pub async fn set_fallback(&self, fallback: Option<FallbackPreference>) -> Result<(), String> {
        {
            let mut guard = self.inner.write().await;
            guard.fallback = fallback.clone();
        }

        persist_preferences(&self.path, &self.inner).await
    }
}

fn read_preferences(path: &Path) -> Result<Preferences, String> {
    if !path.exists() {
        return Ok(Preferences::default());
    }

    let contents = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

async fn persist_preferences(path: &Path, data: &RwLock<Preferences>) -> Result<(), String> {
    let snapshot = {
        let guard = data.read().await;
        guard.clone()
    };

    let serialized = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
    fs::write(path, serialized).map_err(|e| e.to_string())
}
