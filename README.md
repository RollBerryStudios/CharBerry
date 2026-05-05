<p align="center">
  <img src="resources/logo.png" alt="CharBerry Logo" width="220">
</p>

<h1 align="center">CharBerry</h1>

<p align="center">
  <strong>Interactive local character sheets for virtual tabletop rounds.</strong>
</p>

CharBerry is a free, local-first Electron app for creating, editing, viewing,
and maintaining tabletop RPG characters. It focuses on a polished character
sheet experience with automatic calculations, fast editing, responsive layout,
and durable local data.

## Features

| Area | Included |
| --- | --- |
| Character Library | Create, select, search, edit, and delete local character sheets |
| Ability Scores | Automatic D20-style ability modifiers |
| Proficiency | Level-based proficiency bonus calculation |
| Saves and Skills | Saving throw, proficiency, expertise, passive perception, and passive insight calculations |
| Combat | HP, AC, speed, hit dice, attacks, spell DC, and spell attack summaries |
| Story | Personality, ideals, bonds, flaws, backstory, features, inventory, and session notes |
| Persistence | Autosaved local JSON data with import/export |
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
```

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
