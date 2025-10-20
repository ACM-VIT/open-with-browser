use crate::routing::{IncomingLink, RoutingService};
use chrono::Utc;
use std::borrow::Cow;
use tauri::{AppHandle, Manager};
use url::Url;

#[derive(Debug, Clone, Copy)]
pub enum LinkSource {
    InitialLaunch,
    SecondaryInstance,
    #[cfg(any(target_os = "macos", target_os = "ios"))]
    OsEvent,
}

impl LinkSource {
    fn source_app(self) -> &'static str {
        match self {
            LinkSource::InitialLaunch => "System",
            LinkSource::SecondaryInstance => "System (handoff)",
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            LinkSource::OsEvent => "Operating System",
        }
    }

    fn source_context(self) -> &'static str {
        match self {
            LinkSource::InitialLaunch => "App launch arguments",
            LinkSource::SecondaryInstance => "Secondary instance activation",
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            LinkSource::OsEvent => "OS open-url event",
        }
    }
}

pub fn handle_cli_arguments(app: &AppHandle, args: &[String], origin: LinkSource) {
    let urls = extract_urls(args);
    dispatch_urls(app, urls, origin);
}

#[cfg(any(target_os = "macos", target_os = "ios"))]
pub fn handle_open_urls(app: &AppHandle, urls: &[String], origin: LinkSource) {
    let cleaned = urls
        .iter()
        .filter_map(|s| parse_candidate(s))
        .collect::<Vec<_>>();
    dispatch_urls(app, cleaned, origin);
}

fn dispatch_urls(app: &AppHandle, urls: Vec<String>, origin: LinkSource) {
    if urls.is_empty() {
        return;
    }

    let handle = app.clone();

    tauri::async_runtime::spawn(async move {
        let routing = handle.state::<RoutingService>().clone();

        for url in urls {
            let mut link = IncomingLink {
                id: String::new(),
                url: url.clone(),
                source_app: origin.source_app().to_string(),
                source_context: Some(origin.source_context().to_string()),
                contact_name: None,
                preview: None,
                recommended_browser: None,
                arrived_at: Some(Utc::now().to_rfc3339()),
            };

            if link.source_context.as_deref() == Some("") {
                link.source_context = None;
            }

            if let Err(err) = routing.register_incoming(&handle, link).await {
                eprintln!("failed to register incoming link '{url}': {err}");
            }
        }
    });
}

fn extract_urls(args: &[String]) -> Vec<String> {
    let mut collected = Vec::new();
    let mut after_delimiter = false;

    for raw in args {
        if raw == "--" {
            after_delimiter = true;
            continue;
        }

        if let Some(parsed) = parse_argument(raw) {
            push_unique(&mut collected, parsed);
            continue;
        }

        if after_delimiter {
            if let Some(parsed) = parse_candidate(raw) {
                push_unique(&mut collected, parsed);
            }
        } else if let Some(idx) = raw.find('=') {
            let value = &raw[idx + 1..];
            if let Some(parsed) = parse_candidate(value) {
                push_unique(&mut collected, parsed);
            }
        }
    }

    collected
}

fn parse_argument(arg: &str) -> Option<String> {
    if let Some(candidate) = parse_candidate(arg) {
        return Some(candidate);
    }

    // Handle flags such as --url=https://example.com
    if let Some(stripped) = arg.strip_prefix("--url=") {
        return parse_candidate(stripped);
    }

    if let Some(stripped) = arg.strip_prefix("url=") {
        return parse_candidate(stripped);
    }

    None
}

fn parse_candidate(input: &str) -> Option<String> {
    let trimmed = input.trim_matches(|c| matches!(c, '"' | '\''));
    if trimmed.is_empty() {
        return None;
    }

    // Handle surrounding angle brackets that some launchers add.
    let trimmed = trimmed
        .strip_prefix('<')
        .and_then(|s| s.strip_suffix('>'))
        .unwrap_or(trimmed);

    let decoded = percent_decode_if_needed(trimmed);

    if let Ok(url) = Url::parse(&decoded) {
        if matches!(url.scheme(), "http" | "https") {
            return Some(url.to_string());
        }
    }

    None
}

fn percent_decode_if_needed(input: &str) -> Cow<'_, str> {
    if input.contains("%3A") || input.contains("%2F") {
        if let Ok(decoded) = percent_encoding::percent_decode_str(input).decode_utf8() {
            return Cow::Owned(decoded.into_owned());
        }
    }
    Cow::Borrowed(input)
}

fn push_unique(list: &mut Vec<String>, value: String) {
    if !list.iter().any(|existing| existing == &value) {
        list.push(value);
    }
}
