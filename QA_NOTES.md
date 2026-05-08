# CharBerry QA Notes

Status legend: `[x] done`, `[~] partial`, `[ ] missing`.

## User Notes Coverage

- [x] Avatar display is circular.
- [x] Portrait modal with zoom exists.
- [x] Attack fields have visible labels.
- [x] Spells include damage/effect, range, and notes.
- [x] Inventory is a separate tab.
- [x] Inventory fields and currencies are visibly labelled.
- [x] Creator includes "Eigene" options.
- [x] Point Buy option exists.
- [x] Attributes and skills have German labels.
- [~] Portrait masking lacks x/y positioning for a real crop workflow.
- [~] Creator still shows SRD feature names mostly in English.
- [~] Point Buy is currently a preset method, not an interactive budget calculator.
- [~] Extra value features are still limited.
- [ ] Add true portrait crop positioning.
- [ ] Add real point-buy budget UI.
- [ ] Localize SRD preview/features in German.
- [ ] Prioritize high-value sheet features such as rests, spell slots, conditions, and attunement.

## Implementation Guardrails

- Character data must stay backward-compatible with existing saved libraries.
- German UI must avoid unexplained English abbreviations where space allows.
- New character-assistant features need persistence and E2E coverage.
- Validate every tab across desktop and narrow layouts.
