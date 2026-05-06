<p align="center">
  <img src="resources/logo.png" alt="CharBerry Logo" width="220">
</p>

<h1 align="center">CharBerry</h1>

<p align="center">
  <strong>Lokale Charakterbögen für Pen-&amp;-Paper-Runden</strong><br>
  <em>Local-first character sheets for tabletop RPG sessions</em>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-yellow.svg">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.2-blue.svg">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
  <img alt="Local First" src="https://img.shields.io/badge/local--first-offline-brightgreen.svg">
</p>

<p align="center">
  <a href="#deutsch">Deutsch</a> &nbsp;|&nbsp; <a href="#english">English</a>
</p>

---

## Deutsch

CharBerry ist eine **kostenlose, lokale Desktop-App für interaktive
Tabletop-Charakterbögen**. Sie ist für Gruppen gedacht, die keinen kompletten
VTT brauchen oder bereits mit analoger Karte, anderem VTT oder leichtem
Online-Setup spielen.

- **Standalone statt Kampagnen-Suite** - Charakterverwaltung ohne BoltBerry-Projekt
- **Interaktiver Charakterbogen** - Werte schnell bearbeiten, abgeleitete Werte automatisch sehen
- **SRD-Starter** - geführter Start-Workflow mit frei nutzbaren SRD-Grundlagen
- **Portraits, Inventar, Notizen** - strukturierte Daten statt Blank-Textfelder
- **Datenkontrolle** - lokale JSON-Datei, Import/Export, Bridge-Export und Datenordner-Zugriff
- **Mehrsprachig** - Benutzeroberfläche auf Deutsch und Englisch

Gebaut mit Electron, React, TypeScript und Vite. Läuft auf macOS, Windows und
Linux.

### Aktueller Release

Aktuelle Version: **0.1.2**

- [Neueste Release herunterladen](https://github.com/RollBerryStudios/CharBerry/releases/latest)
- [Alle Releases anzeigen](https://github.com/RollBerryStudios/CharBerry/releases)
- Direkter Tag: [v0.1.2](https://github.com/RollBerryStudios/CharBerry/releases/tag/v0.1.2)

| Plattform | Artefakt in der Release |
|---|---|
| Windows x64 | `CharBerry.Setup.0.1.2.exe` |
| Linux x64 | `CharBerry-0.1.2.AppImage`, `charberry_0.1.2_amd64.deb` |
| macOS x64 | `CharBerry-0.1.2.dmg`, `CharBerry-0.1.2-mac.zip` |
| macOS Apple Silicon | `CharBerry-0.1.2-arm64.dmg`, `CharBerry-0.1.2-arm64-mac.zip` |

### Features

| Kategorie | Funktion |
|---|---|
| **Charakterbibliothek** | Charaktere erstellen, suchen, auswählen, duplizieren, exportieren und löschen |
| **SRD-Assistent** | Geführter Starter für SRD-basierte Charaktergrundlagen ohne proprietäre Inhalte |
| **Portraits** | Lokale Charakterbilder importieren und entfernen |
| **Attribute** | D20-typische Attributsmodifikatoren automatisch berechnen |
| **Übungsbonus** | Level-basierte Berechnung des Proficiency Bonus |
| **Rettungswürfe & Fertigkeiten** | Proficiency, Expertise, passive Wahrnehmung und passive Motivkunde |
| **Kampf** | TP, RK, Bewegung, Trefferwürfel, Initiative, Angriffe, Zauber-SG und Zauberangriff |
| **Inventar** | Strukturierte Gegenstände mit Menge, Gewicht, Wert, Ausrüstung, Notizen und Summen |
| **Sitzungsnotizen** | Datierte Notizen mit Titel, Tags und Textkörper |
| **Geschichte** | Persönlichkeit, Ideale, Bindungen, Makel, Vorgeschichte und Merkmale |
| **Kontextmenüs** | Rechtsklick-Aktionen für Charaktere, Angriffe, Zauber, Inventar und Notizen |
| **Datenmenü** | Kompakte Import-/Export-Aktionen, Bridge-JSON, DDB-ähnlicher JSON-Import und Datenordner |
| **Autosave** | Lokale JSON-Persistenz mit Normalisierung beschädigter oder älterer Daten |
| **Responsive UI** | Desktop- und schmale Layouts per Playwright-Screenshots abgesichert |

### Schnellstart

**Voraussetzungen:** Node.js 20+ und npm 10+

```bash
git clone https://github.com/RollBerryStudios/CharBerry.git
cd CharBerry
npm install
npm run dev
```

### Builds erstellen

```bash
npm run build      # TypeScript + Preload + Renderer kompilieren
npm run pack       # Entpacktes App-Verzeichnis für die aktuelle Plattform
npm run dist       # Installer/Distributionspakete für die aktuelle Plattform
```

### Qualitätssicherung

```bash
npm run test:e2e          # Build + Playwright/Electron E2E-Suite
npm run test:e2e:headed   # Gleiche Suite mit sichtbarem Fenster
npm run test:e2e:update   # Screenshot-Baselines nach absichtlichen UI-Änderungen aktualisieren
```

Die E2E-Suite startet CharBerry mit isolierten Testdaten und prüft Rendering,
Berechnungen, Erstellen/Bearbeiten, Persistenz, Normalisierung beschädigter
Daten, deutsche UI, SRD-Assistent, Kontextmenüs, strukturiertes Inventar,
Sitzungsnotizen sowie Desktop-/Responsive-Screenshots ohne Überlappungen.

### Lokale Daten

CharBerry speichert lokal im Electron-AppData-Verzeichnis:

```text
data/charberry-library.json
```

Die Datei wird beim Laden normalisiert, damit beschädigte oder veraltete Daten
die Oberfläche nicht brechen.

### Projektstruktur

```text
src/
  main/          Electron Main-Prozess, IPC und lokale Persistenz
  preload/       Sichere Context Bridge für die Renderer-API
  renderer/      React-App, Charakterbogen, Assistent, i18n
tests/e2e/       Playwright Electron QA-Suite
resources/       Logo und App-Icons
```

### Tech-Stack

| Technologie | Verwendung |
|---|---|
| Electron 41 | Desktop-Shell und native Dialoge |
| React 18 | Benutzeroberfläche |
| TypeScript 5.9 | Typisierte App-Logik |
| Vite 6 | Renderer-Bundling |
| Playwright | Electron E2E und Screenshot-Validierung |
| electron-builder | Packaging für macOS, Windows und Linux |

### CI/CD & Releases

Fertige Builds werden als [GitHub Releases](https://github.com/RollBerryStudios/CharBerry/releases)
veröffentlicht. Die Release-Seite enthält Windows-, Linux- und macOS-Artefakte.
Lokale Builds sind unsigned; notarized macOS-Releases oder signierte
Windows-Installer brauchen eigene Zertifikate und Secrets.

### Lizenz

App-Code: [MIT](LICENSE) (c) 2026 RollBerry Studios.

---

## English

CharBerry is a **free, local-first desktop app for interactive tabletop
character sheets**. It is built for groups that do not need a full VTT, or that
already play with an analog map, another VTT, or a lightweight online setup.

- **Standalone instead of campaign suite** - manage characters without a BoltBerry project
- **Interactive character sheet** - edit quickly and see derived values immediately
- **SRD starter** - guided starter workflow based on open SRD fundamentals
- **Portraits, inventory, notes** - structured data instead of blank text boxes
- **Data control** - local JSON data, import/export, bridge export, and data folder access
- **Multilingual** - English and German interface

Built with Electron, React, TypeScript, and Vite. Runs on macOS, Windows, and
Linux.

### Current Release

Current version: **0.1.2**

- [Download the latest release](https://github.com/RollBerryStudios/CharBerry/releases/latest)
- [View all releases](https://github.com/RollBerryStudios/CharBerry/releases)
- Direct tag: [v0.1.2](https://github.com/RollBerryStudios/CharBerry/releases/tag/v0.1.2)

| Platform | Release artifact |
|---|---|
| Windows x64 | `CharBerry.Setup.0.1.2.exe` |
| Linux x64 | `CharBerry-0.1.2.AppImage`, `charberry_0.1.2_amd64.deb` |
| macOS x64 | `CharBerry-0.1.2.dmg`, `CharBerry-0.1.2-mac.zip` |
| macOS Apple Silicon | `CharBerry-0.1.2-arm64.dmg`, `CharBerry-0.1.2-arm64-mac.zip` |

### Features

| Category | What you get |
|---|---|
| **Character Library** | Create, search, select, duplicate, export, and delete characters |
| **SRD Creator** | Guided starter for SRD-based character foundations without proprietary content |
| **Portraits** | Import and remove local character portraits |
| **Ability Scores** | Automatic D20-style ability modifiers |
| **Proficiency** | Level-based proficiency bonus calculation |
| **Saves & Skills** | Proficiency, expertise, passive perception, and passive insight |
| **Combat** | HP, AC, speed, hit dice, initiative, attacks, spell DC, and spell attack |
| **Inventory** | Structured items with quantity, weight, value, equipped state, notes, and totals |
| **Session Notes** | Dated notes with title, tags, and body text |
| **Story** | Personality, ideals, bonds, flaws, backstory, and features |
| **Context Menus** | Right-click actions for characters, attacks, spells, inventory, and notes |
| **Data Menu** | Compact import/export actions, bridge JSON, DDB-like JSON import, and data folder |
| **Autosave** | Local JSON persistence with normalization of damaged or older data |
| **Responsive UI** | Desktop and narrow layouts covered by Playwright screenshots |

### Getting Started

**Prerequisites:** Node.js 20+ and npm 10+

```bash
git clone https://github.com/RollBerryStudios/CharBerry.git
cd CharBerry
npm install
npm run dev
```

### Building

```bash
npm run build      # Compile TypeScript, preload, and renderer
npm run pack       # Build an unpacked app directory for the current platform
npm run dist       # Build distributable packages for the current platform
```

### Quality Assurance

```bash
npm run test:e2e          # Build + Playwright/Electron E2E suite
npm run test:e2e:headed   # Same suite with a visible window
npm run test:e2e:update   # Refresh screenshot baselines after intentional UI changes
```

The E2E suite launches CharBerry with isolated test data and validates
rendering, calculations, create/edit flows, persistence, damaged data
normalization, German UI, SRD creator, context menus, structured inventory,
session notes, and desktop/responsive screenshots without layout overlaps.

### Local Data

CharBerry stores its local data in the Electron app data folder:

```text
data/charberry-library.json
```

The file is normalized on load so damaged or outdated data cannot break the UI.

### Project Structure

```text
src/
  main/          Electron main process, IPC, and local persistence
  preload/       Safe context bridge for the renderer API
  renderer/      React app, character sheet, creator, i18n
tests/e2e/       Playwright Electron QA suite
resources/       Logo and app icons
```

### Tech Stack

| Technology | Usage |
|---|---|
| Electron 41 | Desktop shell and native dialogs |
| React 18 | User interface |
| TypeScript 5.9 | Typed app logic |
| Vite 6 | Renderer bundling |
| Playwright | Electron E2E and screenshot validation |
| electron-builder | Packaging for macOS, Windows, and Linux |

### CI/CD & Releases

Ready-to-use builds are published as [GitHub Releases](https://github.com/RollBerryStudios/CharBerry/releases).
The release page contains Windows, Linux, and macOS artifacts. Local builds are
unsigned; notarized macOS releases or signed Windows installers require your
own certificates and secrets.

### License

App code: [MIT](LICENSE) (c) 2026 RollBerry Studios.
