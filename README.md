<p align="center">
  <img src="resources/logo.png" alt="CharBerry Logo" width="220">
</p>

<h1 align="center">CharBerry</h1>

<p align="center">
  <strong>Interactive local character sheets for virtual tabletop rounds.</strong>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-yellow.svg">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.2-blue.svg">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white">
  <img alt="Local First" src="https://img.shields.io/badge/local--first-offline-brightgreen.svg">
</p>

CharBerry is a free, local-first Electron app for creating, editing, viewing,
and maintaining tabletop RPG characters. It focuses on a polished character
sheet experience with automatic calculations, fast editing, responsive layout,
and durable local data.

It is intentionally standalone: use it next to an analog table, a separate VTT,
or a lightweight online session when BoltBerry would be more than the group
needs.

## Features

| Area | Included |
| --- | --- |
| Character Library | Create, select, search, duplicate, export, edit, and delete local character sheets |
| SRD Creator | Guided SRD-based starter workflow without proprietary rule content |
| Portraits | Import and remove local character portraits |
| Ability Scores | Automatic D20-style ability modifiers |
| Proficiency | Level-based proficiency bonus calculation |
| Saves and Skills | Saving throw, proficiency, expertise, passive perception, and passive insight calculations |
| Combat | HP, AC, speed, hit dice, attacks, spell DC, and spell attack summaries |
| Inventory | Structured items with quantity, weight, value, equipment state, notes, and totals |
| Session Notes | Structured dated notes with tags and body text |
| Story | Personality, ideals, bonds, flaws, backstory, and features |
| Data Actions | Compact data menu for library import/export, bridge JSON export, DDB-style JSON import, and data folder access |
| Multilingual UI | English and German interface |
| Context Menus | Right-click actions for characters, attacks, spells, inventory rows, and session notes |
| Persistence | Autosaved local JSON data with import/export and damaged data normalization |
| Responsive UI | Desktop and narrow viewport layouts covered by Playwright screenshots |

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run pack
npm run dist
```

The GitHub release workflow builds Windows `.exe`, Linux `.AppImage`/`.deb`,
and macOS `.dmg`/`.zip` artifacts.

## Test

```bash
npm run test:e2e
```

The E2E suite launches Electron with isolated test data and validates:

- first render and core UI
- character calculations
- create/edit persistence
- damaged data normalization
- desktop and responsive screenshot stability
- basic overlap and clipping checks
- German UI, compact data menu, SRD creator, context menus, structured
  inventory, and session notes

See [`docs/TESTING.md`](docs/TESTING.md) for the current QA process and next
coverage targets.

## Data

CharBerry stores data inside the operating system's Electron app data folder:

```text
data/charberry-library.json
```

The file is normalized on load so malformed or outdated local data cannot break
the UI.

## Project Structure

```text
src/main/       Electron main process and local persistence
src/preload/    Safe renderer API bridge
src/renderer/   React character sheet UI
tests/e2e/      Playwright Electron QA suite
resources/      Logo and app icons
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop | Electron |
| Renderer | React + TypeScript |
| Bundler | Vite |
| Tests | Playwright |
| Packaging | electron-builder |

## License

MIT
