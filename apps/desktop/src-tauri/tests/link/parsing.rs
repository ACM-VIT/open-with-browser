use desktop_lib::link::{
    extract_urls,
    parse_argument,
    parse_candidate,
    percent_decode_if_needed,
    push_unique,
};

#[test]
fn extract_urls_collects_unique_links() {
    let args = vec![
        "--url=https://example.com".to_string(),
        "--".to_string(),
        "https://example.com".to_string(),
        "http://other.test".to_string(),
        "invalid".to_string(),
    ];

    let urls = extract_urls(&args);
    assert_eq!(urls.len(), 2);
    assert!(urls.contains(&"https://example.com/".to_string()));
    assert!(urls.contains(&"http://other.test/".to_string()));
}

#[test]
fn parse_argument_handles_flags_and_raw_values() {
    assert_eq!(
        parse_argument("https://example.com"),
        Some("https://example.com/".to_string())
    );
    assert_eq!(
        parse_argument("--url=http://example.org"),
        Some("http://example.org/".to_string())
    );
    assert_eq!(parse_argument("--flag"), None);
}

#[test]
fn parse_candidate_rejects_non_http_urls() {
    assert_eq!(
        parse_candidate("   https://domain.tld  "),
        Some("https://domain.tld/".to_string())
    );
    assert_eq!(parse_candidate("ftp://example.com"), None);
    assert_eq!(parse_candidate("not a url"), None);
}

#[test]
fn percent_decode_if_needed_decodes_common_sequences() {
    let decoded = percent_decode_if_needed("https%3A%2F%2Fexample.com");
    assert_eq!(decoded, "https://example.com");

    let untouched = percent_decode_if_needed("https://example.com");
    assert_eq!(untouched, "https://example.com");
}

#[test]
fn push_unique_only_adds_new_entries() {
    let mut list = vec!["https://example.com".to_string()];
    push_unique(&mut list, "https://example.com".to_string());
    push_unique(&mut list, "http://second.com".to_string());
    assert_eq!(list.len(), 2);
    assert!(list.contains(&"http://second.com".to_string()));
}
