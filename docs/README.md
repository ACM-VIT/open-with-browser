# Documentation

Welcome to the Open With Browser documentation!

## Core Guides

- [Main README](../README.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Browser Discovery Overview](./browser-discovery-overview.md) - Complete technical implementation guide

## Platform-Specific Guides

### Browser Profile Documentation
- **[Windows Browser Profiles](./windows-browser-profiles.md)** - Complete guide to browser profile paths on Windows for Chrome, Edge, Brave, and Firefox
- **[macOS Browser Profiles](./macos-browser-profiles.md)** - Complete guide to browser profile paths on macOS for Chrome, Edge, Brave, and Firefox  
- **[Linux Browser Profiles](./linux-browser-profiles.md)** - Comprehensive guide to browser profile paths across Linux distributions, including Flatpak and Snap installations

### Architecture & Implementation
- **[Discovery Flow Diagrams](./browser-discovery-overview.md#sequence-diagrams)** - Visual workflow documentation
- **[Platform Implementation](./browser-discovery-overview.md#platform-specific-implementation)** - Technical implementation details
- **[Windows Troubleshooting](./browser-discovery-overview.md#windows-troubleshooting)** - Platform-specific edge cases and solutions

## Application Screenshots and Features

### 1. Dashboard
![Screenshot of the Dashboard page](assets/dashboard.png)

The main landing page provides users with a quick overview of the application's real-time status and recent activity. It displays:
- Status of incoming link requests
- Recent hand-offs made by the application
- System integration status

### 2. The Open With Dialog 
![Screenshot of the open with page](assets/open-with.png)

This is the compact, essential pop-up window that appears when a link is intercepted and no rule is matched. It prompts the user to make a manual, immediate routing decision with:
- Available browser options
- Profile selection
- Remember choice option

### 3. Rules Page
![Screenshot of the rules page1](assets/rules_1.png)
![Screenshot of the rules page2](assets/rules_2.png)

The Rules page is the central control panel for automating link and file routing. It allows users to define explicit logic for the app to follow, preventing manual selection.

**Main Functions:**
- **Domain Rules:** Automatically direct web links based on website domain to specific browser profiles
- **File Type Rules:** Assign specific file extensions (.pdf, .fig, etc.) to designated browsers

### 4. Settings
![Screenshot of the settings page1](assets/settings_1.png)
![Screenshot of the settings page2](assets/settings_2.png)

The Settings page is the application's control center for managing OS integration and default link handling.

**Key Areas:**
- **System Setup:** Establish as default browser handler and display detected browsers
- **General Settings:** Core preferences like "Remember browser choice" and "Start app at login"
- **Browser Orchestration & Diagnostics:** Set default fallback browser and troubleshooting tools

## Quick Reference

### Supported Browsers
| Browser | Windows | macOS | Linux | Profile Support | Testing Status |
|---------|---------|--------|-------|-----------------|----------------|
| Google Chrome | ✅ Documented | ✅ Documented | ✅ Documented | ✅ Full Support | ✅ Tested |
| Microsoft Edge | ✅ Documented | ✅ Documented | ✅ Documented | ✅ Full Support | ✅ Tested |
| Brave Browser | ✅ Documented | ✅ Documented | ✅ Documented | ✅ Full Support | ✅ Tested |
| Mozilla Firefox | ✅ Documented | ✅ Documented | ✅ Documented | ✅ Full Support | ✅ Tested |
| Opera | 🔄 Planned | 🔄 Planned | 🔄 Planned | 🔄 Planned | ❌ Not Started |
| Vivaldi | 🔄 Planned | 🔄 Planned | 🔄 Planned | 🔄 Planned | ❌ Not Started |

**Legend:** ✅ Complete | 🔄 In Progress | ❌ Not Started

## Developer Resources

### Development Guides
- **[Browser Discovery Implementation](./browser-discovery-overview.md#implementation-details)** - Technical guide for implementing browser detection
- **[Profile Launching Guide](./browser-discovery-overview.md#profile-loading-flow)** - How to launch browsers with specific profiles
- **[Cross-platform Browser Paths](./browser-discovery-overview.md#platform-specific-implementation)** - Unified approach to browser discovery
- **[Testing Profile Discovery](./browser-discovery-overview.md#testing-guidelines)** - Validation and testing strategies
- **[Security Considerations](./browser-discovery-overview.md#security-considerations)** - Best practices for accessing user data

### Contributing to Browser Support
- **Adding New Browsers** - Follow the browser detection patterns
- **Platform-Specific Implementation** - OS-specific considerations
- **Testing Requirements** - Validation checklist for new browser support

## Getting Started

### For Users
1. **Windows Users:** Start with [Windows Browser Profiles](./windows-browser-profiles.md)
2. **macOS Users:** Start with [macOS Browser Profiles](./macos-browser-profiles.md)  
3. **Linux Users:** Start with [Linux Browser Profiles](./linux-browser-profiles.md)

### For Developers
1. **Architecture Overview:** Review [Browser Discovery Overview](./browser-discovery-overview.md)
2. **Implementation Guide:** Follow platform-specific implementation details
3. **Testing:** Use the comprehensive test suite documentation

### For Contributors
1. **Setup:** Check [Contributing Guidelines](../CONTRIBUTING.md)
2. **Development:** Review architecture and implementation guides
3. **Testing:** Follow validation and testing strategies

## Contributing to Documentation

We welcome improvements to our documentation! Please see our [Contributing Guidelines](../CONTRIBUTING.md) for details on how to submit documentation updates.

### Documentation Standards
- Use clear, concise language with practical examples
- Include code snippets and visual diagrams where helpful
- Keep platform-specific information clearly separated
- Update this index when adding new documents
- Include version compatibility information
- Add security considerations where relevant
- Follow the established documentation structure

### Documentation Structure
```
docs/
├── README.md (this file)
├── browser-discovery-overview.md
├── windows-browser-profiles.md
├── macos-browser-profiles.md
├── linux-browser-profiles.md
└── assets/
    ├── dashboard.png
    ├── open-with.png
    ├── rules_1.png
    ├── rules_2.png
    ├── settings_1.png
    └── settings_2.png
```

## Troubleshooting

### Common Issues
- **Browser Not Detected:** Check platform-specific profile paths
- **Profile Launch Failures:** Verify browser installation and permissions
- **Permission Errors:** Review security considerations and OS-specific requirements

### Platform-Specific Issues
- **Windows:** Registry access, UAC permissions, long path support
- **macOS:** Sandbox restrictions, Gatekeeper, application permissions
- **Linux:** Package manager variations, Flatpak/Snap isolation

## API Documentation

### Core Functions
- `get_browser_profiles(browser_kind, user_data_path)` - Retrieve available profiles
- `parse_browser_kind(browser_name)` - Normalize browser identification
- `launch_browser_with_profile(browser, profile, url)` - Open URL with specific profile

### Data Structures
- `BrowserKind` - Enumeration of supported browsers
- `Profile` - Browser profile information structure
- `BrowserInfo` - Complete browser installation details

---

## Version Information

**Current Documentation Version:** 2.0  
**Last Updated:** October 2024  
**Compatibility:** Open With Browser v1.0+

---

*This documentation is part of the Open With Browser project by [ACM-VIT](https://acmvit.in/)*

