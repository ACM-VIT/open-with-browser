# macOS Browser Profile Paths

This document lists the common macOS paths where major browsers store their profile data. This information is essential for the Open With Browser application to automatically discover and launch browser profiles.

## Table of Contents
- [Chrome (Google Chrome)](#chrome-google-chrome)
- [Edge (Microsoft Edge)](#edge-microsoft-edge)
- [Brave Browser](#brave-browser)
- [Firefox (Mozilla Firefox)](#firefox-mozilla-firefox)
- [Profile Discovery Notes](#profile-discovery-notes)
- [Command Line Arguments](#command-line-arguments)

---

## Chrome (Google Chrome)

### Default Profile Location
~/Library/Application Support/Google/Chrome/Default

### Named Profiles
~/Library/Application Support/Google/Chrome/Profile 1
~/Library/Application Support/Google/Chrome/Profile 2
~/Library/Application Support/Google/Chrome/Profile 3
...


### Custom Named Profiles
Chrome supports custom profile directories with descriptive names:
~/Library/Application Support/Google/Chrome/Profile Work
~/Library/Application Support/Google/Chrome/Profile Personal


**Note**: The names shown in Chrome’s UI (e.g., “Work Profile”, “Personal Profile”) are for display only. Folder names remain in the `Profile X` format.

### Profile Configuration
- **Preferences file**: `~/Library/Application Support/Google/Chrome/[Profile]/Preferences`
- **Local State file**: `~/Library/Application Support/Google/Chrome/Local State`

### Expanded Paths (Examples)
/Users/[Username]/Library/Application Support/Google/Chrome/Default
/Users/[Username]/Library/Application Support/Google/Chrome/Profile 1


---

## Edge (Microsoft Edge)

### Default Profile Location
~/Library/Application Support/Microsoft Edge/Default


### Named Profiles
~/Library/Application Support/Microsoft Edge/Profile 1
~/Library/Application Support/Microsoft Edge/Profile 2
...


### Work/School Profiles
~/Library/Application Support/Microsoft Edge/Profile [ProfileName]


**Note**: Edge on macOS uses the same Chromium-based structure as Chrome.

### Profile Configuration
- **Preferences file**: `~/Library/Application Support/Microsoft Edge/[Profile]/Preferences`
- **Local State file**: `~/Library/Application Support/Microsoft Edge/Local State`

### Expanded Paths (Examples)
/Users/[Username]/Library/Application Support/Microsoft Edge/Default
/Users/[Username]/Library/Application Support/Microsoft Edge/Profile 1


---

## Brave Browser

### Default Profile Location
~/Library/Application Support/BraveSoftware/Brave-Browser/Default


### Named Profiles
~/Library/Application Support/BraveSoftware/Brave-Browser/Profile 1
~/Library/Application Support/BraveSoftware/Brave-Browser/Profile 2
...


### Profile Configuration
- **Preferences file**: `~/Library/Application Support/BraveSoftware/Brave-Browser/[Profile]/Preferences`
- **Local State file**: `~/Library/Application Support/BraveSoftware/Brave-Browser/Local State`

### Expanded Paths (Examples)
/Users/[Username]/Library/Application Support/BraveSoftware/Brave-Browser/Default
/Users/[Username]/Library/Application Support/BraveSoftware/Brave-Browser/Profile 1


---

## Firefox (Mozilla Firefox)

### Profile Root Directory
~/Library/Application Support/Firefox/Profiles


### Profile Naming Convention
Firefox uses a unique identifier format:

~/Library/Application Support/Firefox/Profiles/[8-character-hash].default-release
~/Library/Application Support/Firefox/Profiles/[8-character-hash].default
~/Library/Application Support/Firefox/Profiles/[8-character-hash].[custom-name]


### Profile Configuration
- **profiles.ini file**: `~/Library/Application Support/Firefox/profiles.ini`
- **installs.ini file**: `~/Library/Application Support/Firefox/installs.ini`

### Profile Directory Examples
/Users/[Username]/Library/Application Support/Firefox/Profiles/abc12345.default-release
/Users/[Username]/Library/Application Support/Firefox/Profiles/def67890.work

### Firefox Profile Discovery
To discover Firefox profiles programmatically, read the `profiles.ini` file:

```ini
[Profile0]
Name=default-release
IsRelative=1
Path=Profiles/abc12345.default-release
Default=1

[Profile1]
Name=work
IsRelative=1
Path=Profiles/def67890.work
```

## Profile Discovery Notes

For Chromium-based browsers (Chrome, Edge, Brave):
- Profiles are stored under `~/Library/Application Support/<Browser>/`.
- Each profile has its own `Preferences` file.
- The `Local State` file lists available profiles under `profile.info_cache`.

For Firefox:
- Profiles are stored under `~/Library/Application Support/Firefox/Profiles`.
- Profile names and paths can be discovered by parsing the `profiles.ini` file.

---

## Command Line Arguments

You can launch browsers with a specific profile on macOS using:

```bash
# Chrome
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --profile-directory="Profile 1"

# Edge
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --profile-directory="Default"

# Brave
"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" --profile-directory="Profile 2"

# Firefox
/Applications/Firefox.app/Contents/MacOS/firefox -P "work"

```

## Last Updated
October 2025
