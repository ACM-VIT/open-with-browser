use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::ErrorKind;
use tauri::{async_runtime::RwLock, AppHandle};
use tauri_plugin_store::{Error as StoreError, StoreExt};

const PREFERENCES_STORE: &str = "preferences.json";
const PREFERENCES_KEY: &str = "preferences";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Preferences {
    #[serde(default)]
    pub fallback: Option<FallbackPreference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackPreference {
    pub browser: String,
    #[serde(default)]
    pub profile: Option<ProfilePreference>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProfilePreference {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub directory: Option<String>,
}

pub struct PreferencesState {
    inner: RwLock<Preferences>,
}

impl PreferencesState {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let prefs = load_preferences(app)?;
        Ok(Self {
            inner: RwLock::new(prefs),
        })
    }

    pub async fn fallback(&self) -> Option<FallbackPreference> {
        let guard = self.inner.read().await;
        guard.fallback.clone()
    }

    pub async fn set_fallback(
        &self,
        app: &AppHandle,
        fallback: Option<FallbackPreference>,
    ) -> Result<(), String> {
        {
            let mut guard = self.inner.write().await;
            guard.fallback = fallback.clone();
        }

        persist_preferences(app, &self.inner).await
    }
}

fn load_preferences(app: &AppHandle) -> Result<Preferences, String> {
    let store = app
        .store(PREFERENCES_STORE)
        .map_err(|err| err.to_string())?;

    if let Err(err) = store.reload() {
        match err {
            StoreError::Io(ref io_err) if io_err.kind() == ErrorKind::NotFound => {}
            other => return Err(other.to_string()),
        }
    }

    if let Some(data) = store.get(PREFERENCES_KEY) {
        serde_json::from_value::<Preferences>(data).map_err(|err| err.to_string())
    } else {
        let prefs = Preferences::default();
        let value = serde_json::to_value(&prefs).map_err(|err| err.to_string())?;
        store.set(PREFERENCES_KEY.to_string(), value);
        store.save().map_err(|err| err.to_string())?;
        Ok(prefs)
    }
}

async fn persist_preferences(app: &AppHandle, data: &RwLock<Preferences>) -> Result<(), String> {
    let snapshot = {
        let guard = data.read().await;
        guard.clone()
    };

    let store = app
        .store(PREFERENCES_STORE)
        .map_err(|err| err.to_string())?;

    let value: Value = serde_json::to_value(&snapshot).map_err(|err| err.to_string())?;

    store.set(PREFERENCES_KEY.to_string(), value);
    store.save().map_err(|err| err.to_string())
}
