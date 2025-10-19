use crate::browser_details::{
    get_browsers,
    get_chrome_profiles,
    get_firefox_profiles,
    parse_browser_kind,
    Browsers,
};

fn map_error(err: Box<dyn std::error::Error>) -> String {
    err.to_string()
}

#[tauri::command]
pub fn get_available_browsers() -> Vec<String> {
    get_browsers()
}

#[tauri::command]
pub fn get_profiles(browser_kind: String) -> Result<Vec<String>, String> {
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