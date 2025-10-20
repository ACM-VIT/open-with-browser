use crowser::browser;
use dirs::{config_dir, data_local_dir, home_dir};
use serde::Serialize;
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

#[derive(Debug, Clone, Serialize)]
pub struct ProfileDescriptor {
    pub display_name: String,
    pub directory: String,
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
) -> Result<Vec<ProfileDescriptor>, Box<dyn std::error::Error>> {
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
            let mut file = fs::File::open(&path)?;
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

            let mut profiles: Vec<ProfileDescriptor> = Vec::new();

            for (profile_key, profile_data) in info_cache.iter() {
                let directory = profile_data
                    .get("profile_dir")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_owned())
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| profile_key.to_owned());

                let display = profile_data
                    .get("gaia_name")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_owned())
                    .or_else(|| {
                        profile_data
                            .get("brave_sync_profile_name")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(|s| s.to_owned())
                    })
                    .or_else(|| {
                        profile_data
                            .get("supervised_user_name")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(|s| s.to_owned())
                    })
                    .or_else(|| {
                        profile_data
                            .get("name")
                            .and_then(|v| v.as_str())
                            .filter(|s| !s.is_empty())
                            .map(|s| s.to_owned())
                    })
                    .unwrap_or_else(|| {
                        if profile_key.eq_ignore_ascii_case("default") {
                            "Default".to_string()
                        } else {
                            directory.clone()
                        }
                    });

                if !profiles.iter().any(|p| p.directory == directory) {
                    profiles.push(ProfileDescriptor {
                        display_name: display,
                        directory,
                    });
                }
            }

            if !profiles.iter().any(|p| p.directory == "Default") {
                profiles.push(ProfileDescriptor {
                    display_name: "Default".to_string(),
                    directory: "Default".to_string(),
                });
            }

            profiles.sort_by(|a, b| a.display_name.cmp(&b.display_name));
            return Ok(profiles);
        }
    }

    Ok(Vec::new())
}

pub fn get_chrome_profiles(
    kind: Browsers,
) -> Result<Vec<ProfileDescriptor>, Box<dyn std::error::Error>> {
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

pub fn get_firefox_profiles() -> Result<Vec<ProfileDescriptor>, Box<dyn std::error::Error>> {
    let os_type = tauri_plugin_os::type_();
    let base_dir = match os_type {
        OsType::Windows | OsType::Macos => data_local_dir(),
        OsType::Linux => home_dir(),
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
                    let mut profiles: Vec<ProfileDescriptor> = entries
                        .filter_map(Result::ok)
                        .filter_map(|entry| match entry.file_type() {
                            Ok(file_type) if file_type.is_dir() => {
                                let dir = entry.file_name().to_string_lossy().into_owned();
                                Some(ProfileDescriptor {
                                    display_name: dir.clone(),
                                    directory: dir,
                                })
                            }
                            _ => None,
                        })
                        .collect();
                    profiles.sort_by(|a, b| a.display_name.cmp(&b.display_name));
                    return Ok(profiles);
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
