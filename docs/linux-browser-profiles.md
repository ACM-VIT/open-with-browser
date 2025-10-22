# Linux Browser Profile Paths

This document lists the common Linux paths where major browsers store their profile data. This information is essential for the Open With Browser application to automatically discover and launch browser profiles on Linux distributions.

## Table of Contents
- [Chrome (Google Chrome)](#chrome-google-chrome)
- [Edge (Microsoft Edge)](#edge-microsoft-edge)
- [Brave Browser](#brave-browser)
- [Firefox (Mozilla Firefox)](#firefox-mozilla-firefox)
- [Profile Discovery Notes](#profile-discovery-notes)
- [Command Line Arguments](#command-line-arguments)
- [Distribution-Specific Considerations](#distribution-specific-considerations)

---

## Chrome (Google Chrome)

### Default Profile Location
```
~/.config/google-chrome/Default
```

### Named Profiles
```
~/.config/google-chrome/Profile 1
~/.config/google-chrome/Profile 2
~/.config/google-chrome/Profile 3
...
```

### Custom Named Profiles
Chrome also supports custom profile directories with descriptive names:
```
~/.config/google-chrome/Profile Work
~/.config/google-chrome/Profile Personal
```

**Note**: Custom profile names shown in the Chrome UI (e.g., "Work Profile", "Personal Profile") are for display purposes only. The underlying folder names remain in the `Profile X` format.

### Profile Configuration
- **Preferences file**: `~/.config/google-chrome/[Profile]/Preferences`
- **Local State file**: `~/.config/google-chrome/Local State`

### Expanded Paths (Examples)
```
/home/username/.config/google-chrome/Default
/home/username/.config/google-chrome/Profile 1
```

### Flatpak Installation
When Chrome is installed via Flatpak, profiles are stored in:
```
~/.var/app/com.google.Chrome/config/google-chrome/Default
~/.var/app/com.google.Chrome/config/google-chrome/Profile 1
```

### Snap Installation
When Chrome is installed via Snap, profiles are stored in:
```
~/snap/chromium/common/chromium/Default
~/snap/chromium/common/chromium/Profile 1
```

**Note**: Official Google Chrome snap uses the same paths as the standard installation under `~/.config/google-chrome/`.

---

## Edge (Microsoft Edge)

### Default Profile Location
```
~/.config/microsoft-edge/Default
```

### Named Profiles
```
~/.config/microsoft-edge/Profile 1
~/.config/microsoft-edge/Profile 2
~/.config/microsoft-edge/Profile 3
...
```

### Work/School Profiles
```
~/.config/microsoft-edge/Profile [ProfileName]
```

**Note**: Custom profile names shown in the Edge UI are for display purposes only. The underlying folder names remain in the `Profile X` format.

### Profile Configuration
- **Preferences file**: `~/.config/microsoft-edge/[Profile]/Preferences`
- **Local State file**: `~/.config/microsoft-edge/Local State`

### Expanded Paths (Examples)
```
/home/username/.config/microsoft-edge/Default
/home/username/.config/microsoft-edge/Profile 1
```

### Flatpak Installation
When Edge is installed via Flatpak, profiles are stored in:
```
~/.var/app/com.microsoft.Edge/config/microsoft-edge/Default
~/.var/app/com.microsoft.Edge/config/microsoft-edge/Profile 1
```

---

## Brave Browser

### Default Profile Location
```
~/.config/brave/Default
```

### Named Profiles
```
~/.config/brave/Profile 1
~/.config/brave/Profile 2
~/.config/brave/Profile 3
...
```

### Profile Configuration
- **Preferences file**: `~/.config/brave/[Profile]/Preferences`
- **Local State file**: `~/.config/brave/Local State`

### Expanded Paths (Examples)
```
/home/username/.config/brave/Default
/home/username/.config/brave/Profile 1
```

### Flatpak Installation
When Brave is installed via Flatpak, profiles are stored in:
```
~/.var/app/com.brave.Browser/config/brave/Default
~/.var/app/com.brave.Browser/config/brave/Profile 1
```

### Snap Installation
When Brave is installed via Snap, profiles are stored in:
```
~/snap/brave/current/.config/brave/Default
~/snap/brave/current/.config/brave/Profile 1
```

---

## Firefox (Mozilla Firefox)

### Profile Root Directory
```
~/.mozilla/firefox
```

### Profile Naming Convention
Firefox uses a unique identifier format:
```
~/.mozilla/firefox/[8-character-hash].default-release
~/.mozilla/firefox/[8-character-hash].default
~/.mozilla/firefox/[8-character-hash].[custom-name]
```

### Profile Configuration
- **Profiles.ini file**: `~/.mozilla/firefox/profiles.ini`
- **Installs.ini file**: `~/.mozilla/firefox/installs.ini`

### Profile Directory Examples
```
/home/username/.mozilla/firefox/abc12345.default-release
/home/username/.mozilla/firefox/def67890.work
/home/username/.mozilla/firefox/ghi11121.personal
```

### Firefox Profile Discovery
To discover Firefox profiles programmatically, read the `profiles.ini` file:

```ini
[Profile0]
Name=default-release
IsRelative=1
Path=abc12345.default-release
Default=1

[Profile1]
Name=work
IsRelative=1
Path=def67890.work

[Profile2]
Name=personal
IsRelative=1
Path=ghi11121.personal
```

### Flatpak Installation
When Firefox is installed via Flatpak, profiles are stored in:
```
~/.var/app/org.mozilla.firefox/.mozilla/firefox/[hash].default-release
~/.var/app/org.mozilla.firefox/.mozilla/firefox/[hash].[custom-name]
```

The `profiles.ini` file location:
```
~/.var/app/org.mozilla.firefox/.mozilla/firefox/profiles.ini
```

### Snap Installation
When Firefox is installed via Snap (common on Ubuntu 22.04+), profiles are stored in:
```
~/snap/firefox/common/.mozilla/firefox/[hash].default-release
~/snap/firefox/common/.mozilla/firefox/[hash].[custom-name]
```

The `profiles.ini` file location:
```
~/snap/firefox/common/.mozilla/firefox/profiles.ini
```

---

## Profile Discovery Notes

### Chromium-based Browsers (Chrome, Edge, Brave)

1. **Local State File**: All Chromium-based browsers store profile information in a `Local State` JSON file located in their respective configuration directories under `~/.config/`.

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

4. **XDG Base Directory Specification**: Most browsers follow the XDG Base Directory specification, using `$XDG_CONFIG_HOME` (defaults to `~/.config`) for configuration files.

### Firefox-specific Notes

1. **profiles.ini Parser**: Parse the INI format to discover available profiles.

2. **Profile Paths**: Firefox uses relative paths in `profiles.ini` by default (`IsRelative=1`), so combine with the base profiles directory (`~/.mozilla/firefox`).

3. **Default Profile**: Look for `Default=1` to identify the default profile.

4. **Absolute Paths**: Some profiles may use absolute paths (`IsRelative=0`), so check the `IsRelative` flag before combining paths.

### General Discovery Algorithm

1. Check if the browser is installed by looking for the executable in standard locations (`/usr/bin`, `/usr/local/bin`, `/snap/bin`, `/var/lib/flatpak`)
2. Determine the profile directory based on installation method (native, Flatpak, Snap)
3. Locate the user configuration directory (respecting `$XDG_CONFIG_HOME` or `$HOME`)
4. Parse the configuration files (Local State for Chromium, profiles.ini for Firefox)
5. Enumerate and validate discovered profiles
6. Extract profile names and metadata

### Flatpak and Snap Detection

To detect if a browser is installed via Flatpak or Snap:

**Flatpak**:
```bash
flatpak list --app | grep -i [browser-name]
# Or check for directory existence
test -d ~/.var/app/[app-id]
```

**Snap**:
```bash
snap list | grep -i [browser-name]
# Or check for directory existence
test -d ~/snap/[browser-name]
```

---

## Command Line Arguments

### Chrome/Edge/Brave
```bash
# Launch with specific profile
google-chrome --profile-directory="Profile 1"
microsoft-edge --profile-directory="Default"
brave-browser --profile-directory="Profile 2"

# Launch with custom user data directory
google-chrome --user-data-dir="/path/to/custom/dir"

# Flatpak
flatpak run com.google.Chrome --profile-directory="Profile 1"
flatpak run com.microsoft.Edge --profile-directory="Default"
flatpak run com.brave.Browser --profile-directory="Profile 2"

# Snap
chromium --profile-directory="Profile 1"
```

### Firefox
```bash
# Launch with specific profile
firefox -P "work"
firefox --profile "/home/username/.mozilla/firefox/def67890.work"

# Launch profile manager
firefox -ProfileManager

# Flatpak
flatpak run org.mozilla.firefox -P "work"

# Snap
firefox -P "work"
```

---

## Distribution-Specific Considerations

### Ubuntu / Debian-based Distributions

- **Default Package Manager**: APT
- **Firefox Packaging**: Ubuntu 22.04+ ships Firefox as a Snap by default
- **Chrome Installation**: Requires adding Google's repository or downloading .deb package
- **Edge Installation**: Available via Microsoft's repository
- **Brave Installation**: Available via Brave's repository

**Profile Locations**:
- Native installations: `~/.config/[browser-name]/`
- Snap installations: `~/snap/[browser-name]/common/.mozilla/` or `~/snap/[browser-name]/current/.config/`
- Flatpak installations: `~/.var/app/[app-id]/config/[browser-name]/`

### Fedora / Red Hat-based Distributions

- **Default Package Manager**: DNF/YUM
- **Firefox Packaging**: Usually native RPM package
- **Chrome/Edge/Brave**: Available via third-party repositories or Flatpak

**Profile Locations**:
- Native installations: `~/.config/[browser-name]/`
- Flatpak installations: `~/.var/app/[app-id]/config/[browser-name]/`

### Arch Linux / Manjaro

- **Default Package Manager**: Pacman
- **Browser Availability**: Most browsers available in official repositories or AUR
- **Typical Installation**: Native packages preferred

**Profile Locations**:
- Native installations: `~/.config/[browser-name]/`
- Flatpak installations: `~/.var/app/[app-id]/config/[browser-name]/`

### openSUSE

- **Default Package Manager**: Zypper
- **Browser Availability**: Available via official repositories or third-party repos
- **Typical Installation**: Native packages or Flatpak

**Profile Locations**:
- Native installations: `~/.config/[browser-name]/`
- Flatpak installations: `~/.var/app/[app-id]/config/[browser-name]/`

### Common Caveats

1. **Snap Confinement**: Snap packages run in confined environments and may have limited filesystem access. Profile paths are isolated within the snap container.

2. **Flatpak Sandboxing**: Flatpak applications run in sandboxed environments with restricted access to the host filesystem. Profiles are stored in isolated directories under `~/.var/app/`.

3. **XDG Environment Variables**: Respect `$XDG_CONFIG_HOME` if set by the user (defaults to `~/.config`).

4. **SELinux/AppArmor**: Some distributions use mandatory access control systems that may restrict browser profile access.

5. **Symbolic Links**: Some installations may use symbolic links; always resolve them when discovering profile paths.

6. **Multiple Installation Methods**: Users may have multiple installations of the same browser (e.g., Chrome as both native and Flatpak). Check all possible locations.

---

## Environment Variables Reference

| Variable | Default Value | Description |
|----------|--------------|-------------|
| `$HOME` | `/home/username` | User's home directory |
| `$XDG_CONFIG_HOME` | `~/.config` | User configuration directory |
| `$XDG_DATA_HOME` | `~/.local/share` | User data directory |
| `$XDG_CACHE_HOME` | `~/.cache` | User cache directory |

---

## Version Compatibility

This documentation covers the current profile path conventions as of October 2024. These paths are stable across browser versions but may change in future major releases.

### Browser Version Notes
- **Chrome**: Stable across versions 80+
- **Edge**: Linux version (version 90+)
- **Brave**: All versions since Linux stable release
- **Firefox**: ESR and regular releases (version 70+)

### Distribution Versions Tested
- Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS
- Fedora 38, 39, 40
- Arch Linux (rolling release)
- openSUSE Leap 15.5, Tumbleweed
- Debian 11, 12

---

## Security Considerations

When accessing browser profiles programmatically on Linux:

1. **Read-only Access**: Only read profile configuration files, never modify them while the browser is running
2. **File Locking**: Browser databases may be locked when the browser is active
3. **User Permissions**: Ensure the application has appropriate permissions to access user configuration directories
4. **Privacy**: Handle profile information with care, as it may contain sensitive user data
5. **Sandboxed Environments**: When accessing Flatpak/Snap profiles, be aware of additional permission requirements
6. **File Permissions**: Profile directories typically have `700` (drwx------) permissions; respect these restrictions

---

## Troubleshooting

### Profile Not Found

1. Check if the browser is installed: `which [browser-name]`
2. Verify the profile directory exists: `ls -la ~/.config/[browser-name]/`
3. For Flatpak: `ls -la ~/.var/app/[app-id]/config/[browser-name]/`
4. For Snap: `ls -la ~/snap/[browser-name]/`

### Permission Denied

- Ensure your application has read permissions for the profile directory
- Check SELinux/AppArmor policies if applicable
- For Flatpak/Snap browsers, additional permissions may be required

### Multiple Installation Methods

To detect which installation method is active:
```bash
# Check native installation
which google-chrome

# Check Flatpak
flatpak list | grep Chrome

# Check Snap
snap list | grep chrome
```

---

## See Also

- [Windows Browser Profiles](./windows-browser-profiles.md) - Browser profile paths for Windows
- [Browser Discovery Implementation](./browser-discovery.md) (planned)
- [Profile Launching Guide](./profile-launching.md) (planned)
- [Cross-platform Browser Paths](./cross-platform-paths.md) (planned)

---

## References

- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
- [Flatpak Documentation](https://docs.flatpak.org/)
- [Snap Documentation](https://snapcraft.io/docs)
- [Firefox Profile Manager](https://support.mozilla.org/en-US/kb/profile-manager-create-remove-switch-firefox-profiles)
- [Chromium Command Line Switches](https://peter.sh/experiments/chromium-command-line-switches/)

---

*Last updated: October 2024*
