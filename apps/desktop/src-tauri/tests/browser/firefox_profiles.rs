#![cfg(target_os = "windows")]

use desktop_lib::browser_details::get_firefox_profiles;
use std::fs;
use tempfile::TempDir;

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
fn discovers_profile_directories() {
    let temp = TempDir::new().expect("temp dir");
    let base = temp.path().join("Mozilla/Firefox/Profiles");
    fs::create_dir_all(base.join("abcd.default-release")).expect("create profile dir");
    fs::create_dir_all(base.join("custom.work"   )).expect("create profile dir");
    // include a file to ensure non-dirs skipped
    fs::write(base.join("not_a_dir"), b"noop").expect("create dummy file");

    with_localappdata(&temp, || {
        let mut profiles = get_firefox_profiles().expect("profiles");
        profiles.sort_by(|a, b| a.display_name.cmp(&b.display_name));
        let names: Vec<_> = profiles.iter().map(|p| &p.display_name).collect();
        assert!(names.contains(&"abcd.default-release".to_string()));
        assert!(names.contains(&"custom.work".to_string()));
        assert_eq!(profiles.len(), 2);
    });
}
