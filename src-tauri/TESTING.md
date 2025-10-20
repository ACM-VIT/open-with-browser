# Browser Details Tests

## Overview

Comprehensive test suite for the `browser_details` module covering browser kind parsing, Chrome profile detection, and Firefox profile detection.

## Running Tests

### Run all tests
```bash
cd src-tauri
cargo test
```

### Run specific test
```bash
cargo test test_chrome_profiles_with_gaia_name
```

### Run with output
```bash
cargo test -- --nocapture
```

### Run only browser_details tests
```bash
cargo test --lib browser_details
```

## Test Coverage

### 1. Browser Kind Parsing (parse_browser_kind)

Tests all supported browser aliases and normalization:

- ✅ **Chrome aliases**: "Google Chrome", "google-chrome", "chrome", "Chrome", "GOOGLE CHROME"
- ✅ **Firefox aliases**: "Firefox", "firefox", "Mozilla Firefox", "FIREFOX"
- ✅ **Edge aliases**: "Microsoft Edge", "Edge", "edge", "msedge"
- ✅ **Brave aliases**: "Brave", "brave"
- ✅ **Opera aliases**: "Opera", "opera"
- ✅ **Vivaldi aliases**: "Vivaldi", "vivaldi"
- ✅ **Unknown browsers**: Returns `BrowserKind::Unknown`

### 2. Chrome Profile Tests

#### gaia_name Test
- Creates temporary directory with "Local State" JSON
- Profile has `gaia_name` field (preferred name)
- Verifies `gaia_name` is used over `name`

#### name Fallback Test
- Profile only has `name` field (no `gaia_name`)
- Verifies `name` is used as fallback

#### Missing Profile Directory Test
- "Local State" references profiles
- Profile directories don't exist on filesystem
- Returns empty vec without panicking

#### Non-Existing Path Test
- Passes path that doesn't exist
- Returns empty vec without panicking

#### Missing Local State Test
- Profile directories exist
- No "Local State" file
- Returns empty vec without panicking

#### Invalid JSON Test
- "Local State" contains malformed JSON
- Returns empty vec without panicking

### 3. Firefox Profile Tests

#### Valid INI Test
- Creates valid `profiles.ini`
- Multiple profiles defined
- Verifies all profiles are detected

#### Missing INI Test
- No `profiles.ini` file exists
- Returns empty vec without panicking

#### Non-Existing Path Test
- Path doesn't exist
- Returns empty vec without panicking

### 4. Platform-Specific Tests

#### Windows Path Handling
- Only runs on Windows (`#[cfg(target_os = "windows")]`)
- Tests Windows-specific path handling

#### Unix Path Handling
- Runs on Linux/macOS
- Tests Unix-specific path handling

## Test Structure

All tests use `tempfile::TempDir` to create isolated test environments:

```rust
let temp_dir = TempDir::new().unwrap();
let user_data_path = temp_dir.path();
```

This ensures:
- ✅ No pollution of real filesystem
- ✅ Automatic cleanup after tests
- ✅ Cross-platform compatibility
- ✅ CI/CD friendly

## CI/CD Compatibility

### Windows CI
All tests compile and run on Windows:
- Uses `#[cfg(target_os = "windows")]` for Windows-specific tests
- Path handling works with Windows paths

### Linux CI
Tests run on Linux with proper path handling:
- Unix-specific tests compile only on Linux/macOS
- Tempfile works seamlessly on Unix systems

## Dependencies

```toml
[dev-dependencies]
tempfile = "3.8"
```

The `tempfile` crate provides:
- Temporary directory creation
- Automatic cleanup
- Cross-platform support

## Example Test Output

```
running 15 tests
test browser_details::tests::test_parse_browser_kind_chrome_aliases ... ok
test browser_details::tests::test_parse_browser_kind_firefox_aliases ... ok
test browser_details::tests::test_parse_browser_kind_edge_aliases ... ok
test browser_details::tests::test_chrome_profiles_with_gaia_name ... ok
test browser_details::tests::test_chrome_profiles_with_name_fallback ... ok
test browser_details::tests::test_chrome_profiles_missing_profile_directory ... ok
test browser_details::tests::test_chrome_profiles_non_existing_path ... ok
test browser_details::tests::test_chrome_profiles_missing_local_state ... ok
test browser_details::tests::test_chrome_profiles_invalid_json ... ok
test browser_details::tests::test_firefox_profiles_valid_ini ... ok
test browser_details::tests::test_firefox_profiles_missing_ini ... ok
test browser_details::tests::test_firefox_profiles_non_existing_path ... ok
test browser_details::tests::test_windows_path_handling ... ok

test result: ok. 15 passed; 0 failed; 0 ignored; 0 measured
```

## Troubleshooting

### Tests fail on Windows
- Ensure you have Windows Rust toolchain installed
- Check file permissions in temp directory

### Tests fail on Linux
- Verify tempfile crate is installed: `cargo update`
- Check filesystem permissions

### JSON parsing errors
- Verify serde_json is in dependencies
- Check JSON structure in test data

## Adding New Tests

To add a new test:

1. Add test function in `browser_details.rs`:
```rust
#[test]
fn test_new_feature() {
    // Your test code
}
```

2. Run the test:
```bash
cargo test test_new_feature
```

3. Ensure it works on both Windows and Linux

## Related Documentation

- [Browser Discovery Overview](../../docs/browser-discovery-overview.md)
- [Cargo Test Documentation](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [Tempfile Crate](https://docs.rs/tempfile/)