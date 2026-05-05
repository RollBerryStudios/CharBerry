# CharBerry Testing Process

## Current Coverage

The Playwright Electron suite covers the first production slice of CharBerry:

- first render, title, logo, character roster, and sheet shell
- transparent logo rendering in the app chrome
- every visible sheet tab: Overview, Combat, Skills, Story, and Notes
- desktop screenshot baselines for every sheet tab
- automatic proficiency, initiative, passive perception, spell DC, and spell attack calculations
- skill proficiency and expertise recalculation
- saving throw proficiency recalculation
- spellcasting ability changes and derived spell values
- character creation and active character switching
- roster search across name, ancestry, class, and background
- combat editing for attacks and spells
- vitals, inspiration, story, inventory, and session note editing
- autosave persistence into `data/charberry-library.json`
- damaged local data normalization
- desktop and narrow viewport screenshot baselines
- desktop and responsive Combat screenshots
- basic horizontal overflow, empty bounds, button clipping, and sibling-overlap checks

Current suite size:

- 8 Playwright Electron tests
- 11 screenshot baselines

## Commands

```bash
npm run build
npm run test:e2e
npm run test:e2e:update
npm run pack
```

## Screenshot Baselines

Stored under:

```text
tests/e2e/charberry.e2e.spec.ts-snapshots/
```

Update them intentionally after reviewed UI changes:

```bash
npm run test:e2e:update
```

## Next Coverage Targets

- import/export dialog mocking
- keyboard navigation through the sheet
- print/export layout
- richer inventory and equipment-derived AC
- optional rulesets beyond the current D20-style calculation model
