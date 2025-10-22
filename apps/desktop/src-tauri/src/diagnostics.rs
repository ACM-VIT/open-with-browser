use chrono::Utc;
use serde::Serialize;
use std::sync::RwLock;
use uuid::Uuid;

const MAX_ENTRIES: usize = 500;

#[derive(Debug, Clone, Serialize)]
pub struct DiagnosticEntry {
    pub id: String,
    pub timestamp: String,
    pub message: String,
}

#[derive(Default)]
pub struct DiagnosticsState {
    entries: RwLock<Vec<DiagnosticEntry>>,
}

impl DiagnosticsState {
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(Vec::new()),
        }
    }

    pub fn record(&self, message: impl Into<String>) -> DiagnosticEntry {
        let entry = DiagnosticEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            message: message.into(),
        };
        let mut guard = self.entries.write().expect("diagnostics lock poisoned");
        guard.push(entry.clone());
        if guard.len() > MAX_ENTRIES {
            let excess = guard.len() - MAX_ENTRIES;
            guard.drain(0..excess);
        }
        entry
    }

    pub fn snapshot(&self) -> Vec<DiagnosticEntry> {
        self.entries
            .read()
            .expect("diagnostics lock poisoned")
            .clone()
    }

    pub fn clear(&self) {
        self.entries
            .write()
            .expect("diagnostics lock poisoned")
            .clear();
    }
}
