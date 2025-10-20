```rust
// Browser details module for detecting and managing browser profiles

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BrowserKind {
    Chrome,
    Firefox,
    Edge,
    Brave,
    Opera,
    Vivaldi,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserProfile {
    pub name: String,
    pub profile_dir: String,
    pub path: PathBuf,
}

/// Parse browser name string into BrowserKind enum
pub fn parse_browser_kind(browser_name: &str) -> BrowserKind {
    let normalized = browser_name.to_lowercase();
    
    if normalized.contains("chrome") || normalized == "google chrome" || normalized == "google-chrome" {
        BrowserKind::Chrome
    } else if normalized.contains("firefox") || normalized.contains("mozilla") {
        BrowserKind::Firefox
    } else if normalized.contains("edge") || normalized.contains("msedge") {
        BrowserKind::Edge
    } else if normalized.contains("brave") {
        BrowserKind::Brave
    } else if normalized.contains("opera") {
        BrowserKind::Opera
    } else if normalized.contains("vivaldi") {
        BrowserKind::Vivaldi
    } else {
        BrowserKind::Unknown
    }
}

/// Get Chrome/Chromium-based browser profiles from user data directory
pub fn get_chrome_profiles(user_data_path: &Path) -> Result<Vec<BrowserProfile>, Box<dyn std::error::Error>> {
    let mut profiles = Vec::new();
    
    // Check if path exists
    if !user_data_path.exists() {
        return Ok(profiles);
    }
    
    // Read Local State file
    let local_state_path = user_data_path.join("Local State");
    if !local_state_path.exists() {
        return Ok(profiles);
    }
    
    let local_state_content = match std::fs::read_to_string(&local_state_path) {
        Ok(content) => content,
        Err(_) => return Ok(profiles),
    };
    
    let local_state: serde_json::Value = match serde_json::from_str(&local_state_content) {
        Ok(json) => json,
        Err(_) => return Ok(profiles),
    };
    
    // Parse profile info cache
    if let Some(profile_info) = local_state
        .get("profile")
        .and_then(|p| p.get("info_cache"))
        .and_then(|c| c.as_object())
    {
        for (profile_dir, info) in profile_info {
            let profile_path = user_data_path.join(profile_dir);
            
            // Only include if directory exists
            if !profile_path.exists() || !profile_path.is_dir() {
                continue;
            }
            
            // Get profile name, preferring gaia_name over name
            let profile_name = info
                .get("gaia_name")
                .and_then(|n| n.as_str())
                .or_else(|| info.get("name").and_then(|n| n.as_str()))
                .unwrap_or(profile_dir)
                .to_string();
            
            // Skip empty names
            if profile_name.is_empty() {
                continue;
            }
            
            profiles.push(BrowserProfile {
                name: profile_name,
                profile_dir: profile_dir.clone(),
                path: profile_path,
            });
        }
    }
    
    Ok(profiles)
}

/// Get Firefox profiles from profiles.ini
pub fn get_firefox_profiles(firefox_path: &Path) -> Result<Vec<BrowserProfile>, Box<dyn std::error::Error>> {
    let mut profiles = Vec::new();
    
    // Check if path exists
    if !firefox_path.exists() {
        return Ok(profiles);
    }
    
    let profiles_ini = firefox_path.join("profiles.ini");
    if !profiles_ini.exists() {
        return Ok(profiles);
    }
    
    let content = match std::fs::read_to_string(&profiles_ini) {
        Ok(content) => content,
        Err(_) => return Ok(profiles),
    };
    
    // Simple INI parsing
    let mut current_profile_name: Option<String> = None;
    let mut current_profile_path: Option<String> = None;
    
    for line in content.lines() {
        let line = line.trim();
        
        if line.starts_with("Name=") {
            current_profile_name = Some(line[5..].to_string());
        } else if line.starts_with("Path=") {
            current_profile_path = Some(line[5..].to_string());
        } else if line.is_empty() || line.starts_with('[') {
            // Section end or new section
            if let (Some(name), Some(path)) = (&current_profile_name, &current_profile_path) {
                let full_path = firefox_path.join(path);
                if full_path.exists() {
                    profiles.push(BrowserProfile {
                        name: name.clone(),
                        profile_dir: path.clone(),
                        path: full_path,
                    });
                }
            }
            current_profile_name = None;
            current_profile_path = None;
        }
    }
    
    // Handle last profile if file doesn't end with empty line
    if let (Some(name), Some(path)) = (current_profile_name, current_profile_path) {
        let full_path = firefox_path.join(&path);
        if full_path.exists() {
            profiles.push(BrowserProfile {
                name,
                profile_dir: path,
                path: full_path,
            });
        }
    }
    
    Ok(profiles)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    // Test parse_browser_kind normalization logic
    #[test]
    fn test_parse_browser_kind_chrome_aliases() {
        assert_eq!(parse_browser_kind("Google Chrome"), BrowserKind::Chrome);
        assert_eq!(parse_browser_kind("google-chrome"), BrowserKind::Chrome);
        assert_eq!(parse_browser_kind("chrome"), BrowserKind::Chrome);
        assert_eq!(parse_browser_kind("Chrome"), BrowserKind::Chrome);
        assert_eq!(parse_browser_kind("GOOGLE CHROME"), BrowserKind::Chrome);
    }

    #[test]
    fn test_parse_browser_kind_firefox_aliases() {
        assert_eq!(parse_browser_kind("Firefox"), BrowserKind::Firefox);
        assert_eq!(parse_browser_kind("firefox"), BrowserKind::Firefox);
        assert_eq!(parse_browser_kind("Mozilla Firefox"), BrowserKind::Firefox);
        assert_eq!(parse_browser_kind("FIREFOX"), BrowserKind::Firefox);
    }

    #[test]
    fn test_parse_browser_kind_edge_aliases() {
        assert_eq!(parse_browser_kind("Microsoft Edge"), BrowserKind::Edge);
        assert_eq!(parse_browser_kind("Edge"), BrowserKind::Edge);
        assert_eq!(parse_browser_kind("edge"), BrowserKind::Edge);
        assert_eq!(parse_browser_kind("msedge"), BrowserKind::Edge);
    }

    #[test]
    fn test_parse_browser_kind_brave_aliases() {
        assert_eq!(parse_browser_kind("Brave"), BrowserKind::Brave);
        assert_eq!(parse_browser_kind("brave"), BrowserKind::Brave);
    }

    #[test]
    fn test_parse_browser_kind_unknown() {
        assert_eq!(parse_browser_kind("Unknown Browser"), BrowserKind::Unknown);
        assert_eq!(parse_browser_kind(""), BrowserKind::Unknown);
    }

    // Chrome profile tests - gaia_name
    #[test]
    fn test_chrome_profiles_with_gaia_name() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        fs::create_dir_all(user_data_path.join("Default")).unwrap();
        
        let local_state = serde_json::json!({
            "profile": {
                "info_cache": {
                    "Default": {
                        "gaia_name": "John Doe",
                        "name": "Person 1"
                    }
                }
            }
        });
        
        let mut file = fs::File::create(user_data_path.join("Local State")).unwrap();
        file.write_all(local_state.to_string().as_bytes()).unwrap();

        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "John Doe");
        assert_eq!(profiles[0].profile_dir, "Default");
    }

    // Chrome profile tests - name fallback
    #[test]
    fn test_chrome_profiles_with_name_fallback() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        fs::create_dir_all(user_data_path.join("Default")).unwrap();
        
        let local_state = serde_json::json!({
            "profile": {
                "info_cache": {
                    "Default": {
                        "name": "Person 1"
                    }
                }
            }
        });
        
        let mut file = fs::File::create(user_data_path.join("Local State")).unwrap();
        file.write_all(local_state.to_string().as_bytes()).unwrap();

        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Person 1");
    }

    // Chrome profile tests - missing profile case
    #[test]
    fn test_chrome_profiles_missing_profile_directory() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        let local_state = serde_json::json!({
            "profile": {
                "info_cache": {
                    "Default": {
                        "gaia_name": "John Doe"
                    },
                    "Profile 1": {
                        "name": "Jane Doe"
                    }
                }
            }
        });
        
        let mut file = fs::File::create(user_data_path.join("Local State")).unwrap();
        file.write_all(local_state.to_string().as_bytes()).unwrap();

        // Don't create directories
        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }

    #[test]
    fn test_chrome_profiles_non_existing_path() {
        let non_existing_path = Path::new("/non/existing/path/to/chrome");
        
        let profiles = get_chrome_profiles(non_existing_path).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }

    #[test]
    fn test_chrome_profiles_missing_local_state() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        fs::create_dir_all(user_data_path.join("Default")).unwrap();

        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }

    #[test]
    fn test_chrome_profiles_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        fs::create_dir_all(user_data_path.join("Default")).unwrap();
        
        let mut file = fs::File::create(user_data_path.join("Local State")).unwrap();
        file.write_all(b"{ invalid json }").unwrap();

        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_path_handling() {
        let temp_dir = TempDir::new().unwrap();
        let user_data_path = temp_dir.path();

        fs::create_dir_all(user_data_path.join("Default")).unwrap();
        
        let local_state = serde_json::json!({
            "profile": {
                "info_cache": {
                    "Default": {
                        "gaia_name": "Windows User"
                    }
                }
            }
        });
        
        let mut file = fs::File::create(user_data_path.join("Local State")).unwrap();
        file.write_all(local_state.to_string().as_bytes()).unwrap();

        let profiles = get_chrome_profiles(user_data_path).unwrap();
        
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].name, "Windows User");
    }

    // Firefox profile tests
    #[test]
    fn test_firefox_profiles_valid_ini() {
        let temp_dir = TempDir::new().unwrap();
        let firefox_path = temp_dir.path();

        let profiles_ini = "[Profile0]\nName=default\nPath=Profiles/abc.default\n\n[Profile1]\nName=work\nPath=Profiles/xyz.work\n";

        let mut file = fs::File::create(firefox_path.join("profiles.ini")).unwrap();
        file.write_all(profiles_ini.as_bytes()).unwrap();

        fs::create_dir_all(firefox_path.join("Profiles/abc.default")).unwrap();
        fs::create_dir_all(firefox_path.join("Profiles/xyz.work")).unwrap();

        let profiles = get_firefox_profiles(firefox_path).unwrap();
        
        assert_eq!(profiles.len(), 2);
    }

    #[test]
    fn test_firefox_profiles_missing_ini() {
        let temp_dir = TempDir::new().unwrap();
        
        let profiles = get_firefox_profiles(temp_dir.path()).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }

    #[test]
    fn test_firefox_profiles_non_existing_path() {
        let non_existing_path = Path::new("/non/existing/firefox");
        
        let profiles = get_firefox_profiles(non_existing_path).unwrap();
        
        assert_eq!(profiles.len(), 0);
    }
}
```