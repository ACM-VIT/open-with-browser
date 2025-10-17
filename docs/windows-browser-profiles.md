# Windows Browser Profile Paths

This document lists the common Windows paths where major browsers store their profile data. This information is essential for the Open With Browser application to automatically discover and launch browser profiles.

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
```
%LOCALAPPDATA%\Google\Chrome\User Data\Default
```

### Named Profiles
```
%LOCALAPPDATA%\Google\Chrome\User Data\Profile 1
%LOCALAPPDATA%\Google\Chrome\User Data\Profile 2
%LOCALAPPDATA%\Google\Chrome\User Data\Profile 3
...
```

### Custom Named Profiles
Chrome also supports custom profile directories with descriptive names:
```
%LOCALAPPDATA%\Google\Chrome\User Data\Profile Work
%LOCALAPPDATA%\Google\Chrome\User Data\Profile Personal
```

**Note**: Custom profile names shown in the Chrome UI (e.g., "Work Profile", "Personal Profile") are for display purposes only. The underlying folder names remain in the `Profile X` format.

### Profile Configuration
- **Preferences file**: `%LOCALAPPDATA%\Google\Chrome\User Data\[Profile]\Preferences`
- **Local State file**: `%LOCALAPPDATA%\Google\Chrome\User Data\Local State`

### Expanded Paths (Examples)
```
C:\Users\[Username]\AppData\Local\Google\Chrome\User Data\Default
C:\Users\[Username]\AppData\Local\Google\Chrome\User Data\Profile 1
```

---

## Edge (Microsoft Edge)

### Default Profile Location
```
%LOCALAPPDATA%\Microsoft\Edge\User Data\Default
```

### Named Profiles
```
%LOCALAPPDATA%\Microsoft\Edge\User Data\Profile 1
%LOCALAPPDATA%\Microsoft\Edge\User Data\Profile 2
%LOCALAPPDATA%\Microsoft\Edge\User Data\Profile 3
...
```

### Work/School Profiles
```
%LOCALAPPDATA%\Microsoft\Edge\User Data\Profile [ProfileName]
```

**Note**: Custom profile names shown in the Edge UI are for display purposes only. The underlying folder names remain in the `Profile X` format.

### Profile Configuration
- **Preferences file**: `%LOCALAPPDATA%\Microsoft\Edge\User Data\[Profile]\Preferences`
- **Local State file**: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Local State`

### Expanded Paths (Examples)
```
C:\Users\[Username]\AppData\Local\Microsoft\Edge\User Data\Default
C:\Users\[Username]\AppData\Local\Microsoft\Edge\User Data\Profile 1
```

---

## Brave Browser

### Default Profile Location
```
%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default
```

### Named Profiles
```
%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Profile 1
%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Profile 2
%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Profile 3
...
```

### Profile Configuration
- **Preferences file**: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\[Profile]\Preferences`
- **Local State file**: `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Local State`

### Expanded Paths (Examples)
```
C:\Users\[Username]\AppData\Local\BraveSoftware\Brave-Browser\User Data\Default
C:\Users\[Username]\AppData\Local\BraveSoftware\Brave-Browser\User Data\Profile 1
```

---

## Firefox (Mozilla Firefox)

### Profile Root Directory
```
%APPDATA%\Mozilla\Firefox\Profiles
```

### Profile Naming Convention
Firefox uses a unique identifier format:
```
%APPDATA%\Mozilla\Firefox\Profiles\[8-character-hash].default-release
%APPDATA%\Mozilla\Firefox\Profiles\[8-character-hash].default
%APPDATA%\Mozilla\Firefox\Profiles\[8-character-hash].[custom-name]
```

### Profile Configuration
- **Profiles.ini file**: `%APPDATA%\Mozilla\Firefox\profiles.ini`
- **Installs.ini file**: `%APPDATA%\Mozilla\Firefox\installs.ini`

### Profile Directory Examples
```
C:\Users\[Username]\AppData\Roaming\Mozilla\Firefox\Profiles\abc12345.default-release
C:\Users\[Username]\AppData\Roaming\Mozilla\Firefox\Profiles\def67890.work
C:\Users\[Username]\AppData\Roaming\Mozilla\Firefox\Profiles\ghi11121.personal
```

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

[Profile2]
Name=personal
IsRelative=1
Path=Profiles/ghi11121.personal
```

---

## Profile Discovery Notes

### Chromium-based Browsers (Chrome, Edge, Brave)

1. **Local State File**: All Chromium-based browsers store profile information in a `Local State` JSON file located in their respective `User Data` directories.

2. **Profile List**: The Local State file contains a `profile.info_cache` object with profile details:
   ```json
   {
     "profile": {
       "info_cache": {
         "Default": {
           "name": "Person 1",
           "user_name": "user@example.com"
         },
         "Profile 1": {
           "name": "Work Profile",
           "user_name": "work@company.com"
         }
       }
     }
   }
   ```

3. **Profile Validation**: Check if a profile directory exists and contains a `Preferences` file to confirm it's a valid profile.

### Firefox-specific Notes

1. **profiles.ini Parser**: Parse the INI format to discover available profiles.

2. **Profile Paths**: Firefox uses relative paths in `profiles.ini`, so combine with the base profiles directory.

3. **Default Profile**: Look for `Default=1` to identify the default profile.

### General Discovery Algorithm

1. Check if the browser is installed by looking for the executable
2. Locate the user data/profiles directory
3. Parse the configuration files (Local State for Chromium, profiles.ini for Firefox)
4. Enumerate and validate discovered profiles
5. Extract profile names and metadata

---

## Command Line Arguments

### Chrome/Edge/Brave
```bash
# Launch with specific profile
chrome.exe --profile-directory="Profile 1"
msedge.exe --profile-directory="Default"
brave.exe --profile-directory="Profile 2"

# Launch with custom user data directory
chrome.exe --user-data-dir="C:\Custom\Path"
```

### Firefox
```bash
# Launch with specific profile
firefox.exe -P "work"
firefox.exe --profile "C:\Path\To\Profile"

# Launch profile manager
firefox.exe -ProfileManager
```

---

## Environment Variables Reference

| Variable | Path |
|----------|------|
| `%LOCALAPPDATA%` | `C:\Users\[Username]\AppData\Local` |
| `%APPDATA%` | `C:\Users\[Username]\AppData\Roaming` |
| `%USERPROFILE%` | `C:\Users\[Username]` |

---

## Version Compatibility

This documentation covers the current profile path conventions as of October 2024. These paths are stable across browser versions but may change in future major releases.

### Browser Version Notes
- **Chrome**: Stable across versions 80+
- **Edge**: Chromium-based Edge (version 79+)
- **Brave**: All versions since stable release
- **Firefox**: ESR and regular releases (version 70+)

---

## Security Considerations

When accessing browser profiles programmatically:

1. **Read-only Access**: Only read profile configuration files, never modify them while the browser is running
2. **File Locking**: Browser databases may be locked when the browser is active
3. **User Permissions**: Ensure the application has appropriate permissions to access user data directories
4. **Privacy**: Handle profile information with care, as it may contain sensitive user data

---

## See Also

- [Browser Discovery Implementation](./browser-discovery.md) (planned)
- [Profile Launching Guide](./profile-launching.md) (planned)
- [Cross-platform Browser Paths](./cross-platform-paths.md) (planned)

---

*Last updated: October 2024*