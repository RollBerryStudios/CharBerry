# CharBerry Testing Process

## Current Coverage

The Playwright Electron suite covers the first production slice of CharBerry:

- first render, title, logo, character roster, and sheet shell
- automatic proficiency, initiative, passive perception, spell DC, and spell attack calculations
- skill proficiency and expertise recalculation
- character creation and active character switching
- combat editing for attacks and spells
- autosave persistence into `data/charberry-library.json`
- damaged local data normalization
- desktop and narrow viewport screenshot baselines
- basic horizontal overflow, empty bounds, and button clipping checks

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
