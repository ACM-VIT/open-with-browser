#![cfg(target_os = "windows")]

use desktop_lib::browser_details::{get_chrome_profiles, Browsers};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tempfile::TempDir;

fn write_local_state(temp: &TempDir, relative: &str, contents: &str) -> PathBuf {
    let mut path = temp.path().to_path_buf();
    path.push(relative);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("failed to create Local State parent");
    }
    let mut file = fs::File::create(&path).expect("failed to create Local State file");
    file.write_all(contents.as_bytes())
        .expect("failed to write Local State");
    path
}

fn install_local_state(temp: &TempDir, browser: Browsers, json: &str) {
    let relative = match browser {
        Browsers::Chrome => "Google/Chrome/User Data/Local State",
        Browsers::Edge => "Microsoft/Edge/User Data/Local State",
        Browsers::Brave => "BraveSoftware/Brave-Browser/User Data/Local State",
        _ => panic!("unexpected browser for chrome profile test"),
    };
    write_local_state(temp, relative, json);
}

fn with_localappdata<F: FnOnce()>(temp: &TempDir, f: F) {
    use std::env;
    let original = env::var_os("LOCALAPPDATA");
    env::set_var("LOCALAPPDATA", temp.path());
    f();
    match original {
        Some(val) => env::set_var("LOCALAPPDATA", val),
        None => env::remove_var("LOCALAPPDATA"),
    }
}

#[test]
fn reads_profiles_and_adds_default_when_missing() {
    let temp = TempDir::new().expect("temp dir");
    let local_state = r#"{
        "profile": {
            "info_cache": {
                "Profile 1": {
                    "profile_dir": "Profile 1",
                    "name": "Personal"
                },
                "Profile 2": {
                    "gaia_name": "Work"
                }
            }
        }
    }"#;
    install_local_state(&temp, Browsers::Chrome, local_state);

    with_localappdata(&temp, || {
        let profiles = get_chrome_profiles(Browsers::Chrome).expect("profiles");
        let labels: Vec<_> = profiles.iter().map(|p| &p.display_name).collect();
        assert!(labels.contains(&"Personal".to_string()));
        assert!(labels.contains(&"Work".to_string()));
        assert!(labels.contains(&"Default".to_string()));
    });
}

#[test]
fn deduplicates_profile_directories() {
    let temp = TempDir::new().expect("temp dir");
    let local_state = r#"{
        "profile": {
            "info_cache": {
                "Profile 1": {
                    "profile_dir": "Profile 1",
                    "name": "Personal"
                },
                "Duplicate": {
                    "profile_dir": "Profile 1",
                    "name": "Duplicate"
                }
            }
        }
    }"#;
    install_local_state(&temp, Browsers::Chrome, local_state);

    with_localappdata(&temp, || {
        let profiles = get_chrome_profiles(Browsers::Chrome).expect("profiles");
        let dirs: Vec<_> = profiles.iter().map(|p| &p.directory).collect();
        assert_eq!(dirs.iter().filter(|d| d.as_str() == "Profile 1").count(), 1);
    });
}
