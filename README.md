# Open With Browser

A Tauri application that allows you to open URLs with specific browsers and profiles.

## Features

- Browser discovery and management
- Profile detection for multiple browsers
- Cross-platform support (Windows, macOS, Linux)
- Built with Rust and Tauri

## Documentation

For detailed information, see the [docs](./docs) folder.

### Core Documentation
- **[Browser Discovery Overview](./docs/browser-discovery-overview.md)** - Complete guide to how browser discovery works
  - Frontend to Rust backend communication flow
  - Tauri command implementation  
  - Platform-specific filesystem access
  - Interactive mermaid sequence diagrams
  - Windows troubleshooting and edge cases
  
- **[Documentation Index](./docs/README.md)** - Full documentation navigation and quick links

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Build for production
npm run tauri build
```

## Development

This project uses:
- **Tauri** - Desktop app framework
- **Rust** - Backend logic
- **React/Vue** - Frontend UI (specify which one you use)

## Contributing

Contributions are welcome! Please see the [Contributing Guidelines](./CONTRIBUTING.md).

## License

[Your License Here]
