use crowser::browser;
use dirs::{config_dir, data_local_dir};
use serde_json::Value;
use std::{
    fs,
    io::{self, Read},
};
use tauri_plugin_os::OsType;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Browsers {
    Chrome,
    Edge,
    Brave,
    FireFox,
    Safari,
}

pub fn get_browsers() -> Vec<String> {
    let browser_vector = browser::get_all_existing_browsers();
    let browser_names: Vec<String> = browser_vector.iter().map(|s| s.name.to_owned()).collect();

    return browser_names;
}

pub fn parse_browser_kind<S: AsRef<str>>(value: S) -> Option<Browsers> {
    let normalized = value.as_ref().trim().to_lowercase().replace([' ', '-'], "");

    match normalized.as_str() {
        "chrome" | "googlechrome" => Some(Browsers::Chrome),
        "edge" | "microsoftedge" => Some(Browsers::Edge),
        "brave" | "bravebrowser" => Some(Browsers::Brave),
        "firefox" | "mozillafirefox" => Some(Browsers::FireFox),
        "safari" => Some(Browsers::Safari),
        _ => None,
    }
}

pub fn get_chrome_based_profiles(
    os_paths: [&str; 3],
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let os_type = tauri_plugin_os::type_();
    let base_dir = match os_type {
        OsType::Windows | OsType::Macos => data_local_dir(),
        OsType::Linux => config_dir(),
        _ => None,
    };

    if let Some(mut path) = base_dir {
        let suffix = match os_type {
            OsType::Windows => os_paths[0],
            OsType::Macos => os_paths[1],
            OsType::Linux => os_paths[2],
            _ => return Ok(Vec::new()),
        };
        path.push(suffix);

        if path.exists() {
            let mut file = fs::File::open(path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;

            let json_value: Value = serde_json::from_str(&contents)?;

            let info_cache = json_value
                .get("profile")
                .and_then(|p| p.get("info_cache"))
                .and_then(|ic| ic.as_object())
                .ok_or_else(|| {
                    Box::new(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "Could not find 'profile' or 'info_cache' in JSON.",
                    )) as Box<dyn std::error::Error>
                })?;

            let mut profile_names: Vec<String> = Vec::new();

            for (_profile_key, profile_data) in info_cache.iter() {
                if let Some(name_value) = profile_data.get("gaia_name") {
                    if let Some(name_str) = name_value.as_str() {
                        profile_names.push(name_str.to_owned());
                    }
                }
            }

            return Ok(profile_names);
        }
    }

    Ok(Vec::new())
}

pub fn get_chrome_profiles(kind: Browsers) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let paths: [&str; 3] = match kind {
        Browsers::Chrome => [
            "Google\\Chrome\\User Data\\Local State",
            "Google/Chrome/Local State",
            "google-chrome/Local State",
        ],
        Browsers::Edge => [
            "Microsoft\\Edge\\User Data\\Local State",
            "Microsoft/Edge/Local State",
            "microsoft-edge/Local State",
        ],
        Browsers::Brave => [
            "BraveSoftware\\Brave-Browser\\User Data\\Local State",
            "BraveSoftware/Brave-Browser/Local State",
            "brave/Local State",
        ],
        _ => return Ok(Vec::new()),
    };

    get_chrome_based_profiles(paths)
}

pub fn get_firefox_profiles() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let os_type = tauri_plugin_os::type_();
    let base_dir = match os_type {
        OsType::Windows | OsType::Macos => data_local_dir(),
        OsType::Linux => dirs::home_dir(),
        _ => None,
    };

    if let Some(mut path) = base_dir {
        match os_type {
            OsType::Windows => path.push("Mozilla\\Firefox\\Profiles"),
            OsType::Macos => path.push("Firefox/Profiles"),
            OsType::Linux => path.push(".mozilla/firefox"),
            _ => return Ok(Vec::new()),
        }

        if path.exists() {
            match fs::read_dir(path) {
                Ok(entries) => {
                    let profile_names: Vec<String> = entries
                        .filter_map(Result::ok)
                        .filter_map(|entry| match entry.file_type() {
                            Ok(file_type) if file_type.is_dir() => {
                                Some(entry.file_name().to_string_lossy().into_owned())
                            }
                            _ => None,
                        })
                        .collect();
                    return Ok(profile_names);
                }
                Err(e) => {
                    eprintln!("Error reading directory: {}", e);
                    return Ok(Vec::new());
                }
            }
        }
    }

    return Ok(Vec::new());
}
