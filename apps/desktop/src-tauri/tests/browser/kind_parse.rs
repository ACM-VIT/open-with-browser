use desktop_lib::browser_details::{parse_browser_kind, Browsers};

#[test]
fn parses_common_browser_names() {
    assert_eq!(parse_browser_kind("Chrome"), Some(Browsers::Chrome));
    assert_eq!(parse_browser_kind(" google-chrome"), Some(Browsers::Chrome));
    assert_eq!(parse_browser_kind("MICROSOFT EDGE"), Some(Browsers::Edge));
    assert_eq!(parse_browser_kind("Brave Browser"), Some(Browsers::Brave));
    assert_eq!(parse_browser_kind("MozillaFirefox"), Some(Browsers::FireFox));
    assert_eq!(parse_browser_kind("Safari"), Some(Browsers::Safari));
}

#[test]
fn returns_none_for_unknown_browser() {
    assert_eq!(parse_browser_kind("Netscape"), None);
    assert_eq!(parse_browser_kind(""), None);
    assert_eq!(parse_browser_kind("   "), None);
}
