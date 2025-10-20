<div align="center">
  
Made with ❤️ by <a href="https://acmvit.in/" target="_blank">ACM‑VIT</a>

![Footer GIF](https://raw.githubusercontent.com/ACM-VIT/.github/master/profile/domains.gif)

</div>
<div align="center">

![Forktober GIF](https://raw.githubusercontent.com/ACM-VIT/.github/master/profile/acm_gif_banner.gif)

<h2>Open With Browser</h2>

<p>Intelligent link routing for your desktop: automatically open links in the right browser and profile.</p>

<p>
  <a href="https://acmvit.in/" target="_blank">
    <img alt="made-by-acm" src="https://img.shields.io/badge/MADE%20BY-ACM%20VIT-orange?style=flat-square&logo=acm&link=acmvit.in" />
  </a>
  <img alt="license" src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" />
  <img alt="tauri" src="https://img.shields.io/badge/Tauri-v2-blue?style=flat-square" />
  <img alt="react" src="https://img.shields.io/badge/React-19-blue?style=flat-square" />
</p>

</div>

---

## Table of Contents

- [About](#about)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Contributing](#contributing)
- [Hacktoberfest](#hacktoberfest)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Guidelines for Pull Request](#guidelines-for-pull-request)
- [License](#license)
- [Authors](#authors)

---

## About

Open With Browser is a desktop application that enhances link management by choosing the right browser and profile automatically based on user-defined rules.

Examples:

- Open all GitHub links in your “Coding” Chrome profile.
- Open IEEE Xplore links in your “University” profile.

If a link doesn’t match any rule, a fallback “Open With” dialog appears listing all detected browsers and their profiles. You can open “Just once” or create an “Always” rule on the fly.

Key features:

- Rule-based routing by host, path, query, scheme, and more
- Automatic browser and profile discovery (Chrome/Edge/Brave/Firefox)
- Smart fallback dialog with “Just once” and “Always” options
- Cross-platform via Tauri (Windows/macOS/Linux)
- Import/export rules, optional telemetry, and audit logs

---

## Architecture (planned)

- Frontend: React + Vite (apps/desktop)
- Backend: Tauri v2 (Rust) with modular services
  - Rule Engine: evaluates URL → Action (browser/profile)
  - Browser Discovery: finds installed browsers per OS
  - Profile Resolver: lists/launches profiles for Chromium/Firefox
  - Opener: spawns the selected browser with correct args
  - Registration: register as default handler for http/https
  - Storage: SQLite for rules/settings (planned)

---

## Project Structure

Monorepo style to grow comfortably:

```
open-with-browser/
├─ apps/
│  └─ desktop/               # Tauri app (React + Vite + Rust)
│     ├─ src/                # UI
│     └─ src-tauri/          # Rust backend
├─ packages/                 # Future shared crates/libs
├─ docs/                     # Architecture notes, specs
├─ README.md
├─ LICENSE (MIT)
└─ CODE_OF_CONDUCT.md
```

---

## Prerequisites

Before running, make sure the following are installed:

- [Rust toolchain (stable)](https://www.rust-lang.org/tools/install)
- [Bun](https://bun.sh/)
- [Tauri CLI](https://tauri.app/v2/guides/getting-started/prerequisites/)
- [Node.js (optional)](https://nodejs.org/) — only needed if using `npm`

> 💡 **Tip:**
>
> - Windows users: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) for Rust to compile.
> - Linux/macOS users: ensure you have `curl`, `pkg-config`, and `libgtk-3-dev` or equivalents.

For detailed requirements: [Tauri v2 Prerequisites](https://v2.tauri.app/start/prerequisites/)

---

## Quick Start

You can run this project with **Bun** or **npm**.  
Follow your platform-specific setup below 👇

---

### 🪟 Windows Setup (Bun + Tauri)

```powershell
# 1) Clone the repository
git clone https://github.com/ACM-VIT/open-with-browser.git
cd open-with-browser

# 2) Navigate to the app
cd apps/desktop

# 3) Install dependencies with Bun
bun install

# 4) Run the Tauri development server
bun run tauri dev

# Optional: using npm instead of Bun
# npm install
# npm run tauri dev
```

**Build a release installer (Windows .exe):**

```powershell
cd apps/desktop
bun run tauri build
```

---

### 🐧 Linux/macOS Setup (Bun + Tauri)

```bash
# 1) Clone the repository
git clone https://github.com/ACM-VIT/open-with-browser.git
cd open-with-browser

# 2) Go to the desktop app folder
cd apps/desktop

# 3) Install dependencies with Bun
bun install

# 4) Start the development environment
bun run tauri dev

# Or use npm if preferred
# npm install && npm run tauri dev
```

**Build release package (AppImage, .dmg, etc):**

```bash
cd apps/desktop
bun run tauri build
```

✅ After successful build, check the `src-tauri/target/release/` directory for your compiled app.

---

## Usage (Planned)

1. Launch the app.
2. In Settings, register Open With Browser as your default handler for http/https.
3. Create a few rules (e.g., host: github.com → Chrome [Coding]).
4. Click a link anywhere—matching rules will route it automatically.
5. If unmatched, the “Open With” dialog appears; choose a browser/profile:
   - Just once: open now, don’t save a rule
   - Always: open now and create a rule for next time

💡 Tip: You can import/export rules from Settings.

---

## Contributing

We welcome contributions of all kinds! Please read our [Contributing Guidelines](CONTRIBUTING.md) to get started quickly and make your PRs count.

---

## Hacktoberfest

<p>
  <a href="https://hacktoberfest.com/" target="_blank">
    <img alt="hacktoberfest" src="https://img.shields.io/github/hacktoberfest/2025/ACM-VIT/open-with-browser?style=flat-square&labelColor=indigo" />
  </a>
</p>

Join us for Hacktoberfest! Quality > quantity.

- Aim for meaningful, well-scoped PRs that solve real issues.
- Non-code contributions (docs, design, tutorials) are welcome via PR.
- Full participation details: https://hacktoberfest.com/participation

---

## Submitting a Pull Request

1. Fork the repository
2. Clone your fork locally:
   ```powershell
   git clone <HTTPS-ADDRESS>
   cd <NAME-OF-REPO>
   ```
3. Create a new branch:
   ```powershell
   git checkout -b <your-branch-name>
   ```
4. Make your changes and stage them:
   ```powershell
   git add .
   ```
5. Commit your changes:
   ```powershell
   git commit -m "docs: improve README Quick Start for Windows + Bun + Tauri (#1)"
   ```
6. Push to your fork:
   ```powershell
   git push origin <your-branch-name>
   ```
7. Open a Pull Request and clearly describe what you changed and why.  
   Link related issues (e.g., “Fixes #1”).

---

## Guidelines for Pull Request

- Avoid PRs that are automated/scripted or plagiarized from someone else’s work.
- Don’t spam; keep each PR focused and meaningful.
- The project maintainer’s decision on PR validity is final.
- For more, see our [Contributing Guidelines](CONTRIBUTING.md) and the Hacktoberfest [participation rules](https://hacktoberfest.com/participation).

---

## License

MIT © 2025 ACM VIT — see [LICENSE](LICENSE).

---

## Authors

**Authors:** <!-- Add maintainers here -->  
**Contributors:** <!-- Generate contributors list using https://contributors-img.web.app/preview -->

---

## Community & Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

<div align="center">
  
Made with ❤️ by <a href="https://acmvit.in/" target="_blank">ACM-VIT</a>

![Footer GIF](https://raw.githubusercontent.com/ACM-VIT/.github/master/profile/domains.gif)

</div>
