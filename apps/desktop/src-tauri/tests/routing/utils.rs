use desktop_lib::routing::{add_profile_args, normalize_browser_key, normalize_url};
use std::process::Command;

fn command_args(command: &Command) -> Vec<String> {
    command
        .get_args()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect()
}

#[test]
fn normalize_url_handles_missing_scheme_and_whitespace() {
    assert_eq!(normalize_url(" https://example.com "), "https://example.com");
    assert_eq!(normalize_url("example.com"), "https://example.com");
    assert_eq!(normalize_url("http://already.com"), "http://already.com");
    assert_eq!(normalize_url(""), "");
    assert_eq!(normalize_url("not a url"), "not a url");
}

#[test]
fn normalize_browser_key_strips_non_alphanumeric() {
    assert_eq!(normalize_browser_key("Google Chrome"), "googlechrome");
    assert_eq!(normalize_browser_key(" Edge " ), "edge");
    assert_eq!(normalize_browser_key("FIRE-FOX"), "firefox");
}

#[test]
fn add_profile_args_adds_expected_switches() {
    let mut command = Command::new("browser");
    add_profile_args(&mut command, "Chrome", "Work Profile");
    let args = command_args(&command);
    assert!(args.contains(&"--profile-directory=Work Profile".to_string()));

    let mut firefox = Command::new("browser");
    add_profile_args(&mut firefox, "Firefox", "Develop" );
    let args = command_args(&firefox);
    assert_eq!(args, vec!["-P", "Develop"]);

    let mut empty = Command::new("browser");
    add_profile_args(&mut empty, "Chrome", "   ");
    assert!(command_args(&empty).is_empty());
}
