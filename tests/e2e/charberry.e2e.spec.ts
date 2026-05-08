import { expect, test } from '@playwright/test'
import { launchCharBerry, readSavedLibrary, sampleLibrary, type CharacterLibrary } from './helpers/charberryApp'

test.describe('CharBerry Electron QA', () => {
  test('renders the character library and responsive sheet without broken controls', async ({}, testInfo) => {
    const { app, page } = await launchCharBerry(testInfo)
    try {
      await expect(page).toHaveTitle('CharBerry')
      await expect(page.locator('.brand img')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
      await expect(page.getByText('Aster Rowan')).toBeVisible()
      await expect(page.getByText('Level 5 Half-Elf Ranger')).toBeVisible()
      await expect(page.getByText('Passive Perception')).toBeVisible()
      await expect(page.getByText('Spell DC')).toBeVisible()
      await expect(page.locator('.ability-box')).toHaveCount(6)
      await expect.poll(() => page.locator('.brand img').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-character-overview.png', { fullPage: true })
    } finally {
      await app.close()
    }
  })

  test('covers every sheet tab with stable desktop screenshots and no layout collisions', async ({}, testInfo) => {
    const { app, page } = await launchCharBerry(testInfo)
    try {
      const tabs = ['Overview', 'Combat', 'Skills', 'Story', 'Inventory', 'Notes']
      for (const tab of tabs) {
        await page.getByRole('button', { name: tab }).click()
        await assertVisibleLayout(page)
        await assertNoUnexpectedOverlaps(page)
        await expect(page).toHaveScreenshot(`charberry-tab-${tab.toLowerCase()}-desktop.png`, { fullPage: true })
      }

      await page.getByRole('button', { name: 'Combat' }).click()
      await expect(page.getByRole('heading', { name: 'Attacks' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Spells' })).toBeVisible()
      await page.getByRole('button', { name: 'Skills' }).click()
      await expect(page.locator('.save-row')).toHaveCount(6)
      await expect(page.locator('.skill-row')).toHaveCount(18)
      await page.getByRole('button', { name: 'Inventory' }).click()
      await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
      await expect(page.locator('.inventory-row')).toHaveCount(3)
      await page.getByRole('button', { name: 'Notes' }).click()
      await expect(page.getByRole('heading', { name: 'Session Notes' })).toBeVisible()
      await expect(page.locator('.session-note')).toHaveCount(1)
    } finally {
      await app.close()
    }
  })

  test('searches and switches a larger character roster without losing active sheet state', async ({}, testInfo) => {
    const library = multiCharacterLibrary()
    const { app, page, libraryPath } = await launchCharBerry(testInfo, { library })
    try {
      await expect(page.locator('.roster-card')).toHaveCount(3)
      await page.getByLabel('Search characters').fill('cleric')
      await expect(page.locator('.roster-card')).toHaveCount(1)
      await expect(page.locator('.roster-card')).toContainText('Brother Caldus')
      await page.locator('.roster-card', { hasText: 'Brother Caldus' }).click()
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Brother Caldus')
      await expect(page.getByLabel('Class', { exact: true })).toHaveValue('Cleric')

      await page.getByLabel('Search characters').fill('')
      await page.locator('.roster-card', { hasText: 'Mira Vale' }).click()
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Mira Vale')
      await page.getByLabel('Level', { exact: true }).fill('7')

      await expect.poll(() => {
        const saved = readSavedLibrary(libraryPath)
        return {
          active: saved.characters.find((character) => character.id === saved.activeCharacterId)?.name,
          miraLevel: saved.characters.find((character) => character.id === 'char-mira')?.level,
        }
      }).toEqual({ active: 'Mira Vale', miraLevel: 7 })
    } finally {
      await app.close()
    }
  })

  test('calculates modifiers, proficiency, saves, skills, and persists edited values', async ({}, testInfo) => {
    const { app, page, libraryPath } = await launchCharBerry(testInfo)
    try {
      await expect(page.locator('.stat', { hasText: 'Proficiency' })).toContainText('+3')
      await expect(page.locator('.stat', { hasText: 'Initiative' })).toContainText('+4')
      await expect(page.locator('.stat', { hasText: 'Passive Perception' })).toContainText('16')
      await expect(page.locator('.stat', { hasText: 'Spell DC' })).toContainText('14')

      await page.getByLabel('Level').fill('9')
      await expect(page.locator('.stat', { hasText: 'Proficiency' })).toContainText('+4')
      await expect(page.locator('.stat', { hasText: 'Spell DC' })).toContainText('15')

      await page.getByRole('button', { name: 'Skills' }).click()
      await expect(page.locator('.skill-row', { hasText: 'Stealth' })).toContainText('+12')
      await page.locator('.skill-row', { hasText: 'Perception' }).locator('select').selectOption('expertise')
      await expect(page.locator('.skill-row', { hasText: 'Perception' })).toContainText('+11')
      await expect(page.locator('.stat', { hasText: 'Passive Perception' })).toContainText('21')

      await expect.poll(() => {
        const saved = readSavedLibrary(libraryPath)
        return {
          level: saved.characters[0].level,
          perception: saved.characters[0].skills.perception,
        }
      }).toEqual({ level: 9, perception: 'expertise' })
    } finally {
      await app.close()
    }
  })

  test('creates characters, edits combat data, adds attacks and spells, and saves them', async ({}, testInfo) => {
    const { app, page, libraryPath } = await launchCharBerry(testInfo)
    try {
      await page.getByRole('button', { name: 'New' }).click()
      await page.getByLabel('Name').fill('Mira Vale')
      await page.getByLabel('Class', { exact: true }).fill('Wizard')
      await page.getByLabel('Level', { exact: true }).fill('3')
      await page.getByRole('button', { name: 'Combat' }).click()
      await page.getByRole('button', { name: 'Add Attack' }).click()
      await page.locator('.attack-row').last().locator('label', { hasText: 'Name' }).locator('input').fill('Fire Bolt')
      await page.locator('.attack-row').last().locator('label', { hasText: 'Bonus' }).locator('input').fill('+5')
      await page.locator('.attack-row').last().locator('label', { hasText: 'Damage' }).locator('input').fill('1d10')
      await page.getByRole('button', { name: 'Add Spell' }).click()
      await page.locator('.spell-row').last().locator('label', { hasText: 'Name' }).locator('input').fill('Shield')
      await page.locator('.spell-row').last().locator('label', { hasText: 'Level' }).locator('input').fill('1')

      await expect.poll(() => {
        const saved = readSavedLibrary(libraryPath)
        const active = saved.characters.find((character) => character.id === saved.activeCharacterId)
        return {
          count: saved.characters.length,
          name: active?.name,
          attack: active?.attacks[0]?.name,
          spell: active?.spells[0]?.name,
        }
      }).toEqual({ count: 2, name: 'Mira Vale', attack: 'Fire Bolt', spell: 'Shield' })
    } finally {
      await app.close()
    }
  })

  test('flushes pending character edits when the window closes immediately', async ({}, testInfo) => {
    const { app, page, libraryPath } = await launchCharBerry(testInfo)
    await page.getByLabel('Name').fill('Quick Close Ranger')
    await app.close()
    expect(readSavedLibrary(libraryPath).characters[0].name).toBe('Quick Close Ranger')
  })

  test('opens the circular portrait mask with zoom and position controls', async ({}, testInfo) => {
    const library = sampleLibrary()
    library.characters[0].portraitDataUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23b84f61"/><circle cx="78" cy="44" r="32" fill="%23ffe8ae"/></svg>'
    const { app, page, libraryPath } = await launchCharBerry(testInfo, { library })
    try {
      await page.getByRole('button', { name: 'Portrait mask' }).click()
      await expect(page.getByRole('dialog', { name: 'Portrait mask' })).toBeVisible()
      await expect(page.getByLabel('Zoom')).toBeVisible()
      await expect(page.getByLabel('Horizontal position')).toBeVisible()
      await expect(page.getByLabel('Vertical position')).toBeVisible()
      await setRange(page, 'Zoom', 1.5)
      await setRange(page, 'Horizontal position', 12)
      await setRange(page, 'Vertical position', -10)
      await expect(page.locator('.portrait-mask img')).toHaveCSS('transform', /matrix/)
      await page.getByRole('button', { name: 'Close' }).click()
      await expect.poll(() => {
        const active = readSavedLibrary(libraryPath).characters[0]
        return { zoom: active.portraitZoom, x: active.portraitOffsetX, y: active.portraitOffsetY }
      }).toEqual({ zoom: 1.5, x: 12, y: -10 })
    } finally {
      await app.close()
    }
  })

  test('edits story, notes, vitals, inspiration, saving throws, and spellcasting ability', async ({}, testInfo) => {
    const { app, page, libraryPath } = await launchCharBerry(testInfo)
    try {
      await page.getByLabel('Armor Class').fill('18')
      await page.getByLabel('Current HP').fill('31')
      await page.getByLabel('Temp HP').fill('6')
      await page.locator('.quick-card .check-line input').check()

      await page.getByRole('button', { name: 'Combat' }).click()
      await page.getByLabel('Spellcasting Ability').selectOption('int')
      await expect(page.locator('.stat', { hasText: 'Spell DC' })).toContainText('12')
      await expect(page.locator('.stat', { hasText: 'Spell Attack' })).toContainText('+4')

      await page.getByRole('button', { name: 'Skills' }).click()
      await page.locator('.save-row', { hasText: 'WIS' }).locator('input').check()
      await expect(page.locator('.save-row', { hasText: 'WIS' })).toContainText('+6')

      await page.getByRole('button', { name: 'Story' }).click()
      await page.locator('.text-card', { hasText: 'Personality' }).locator('textarea').fill('Speaks softly before drawing a blade.')
      await page.locator('.text-card', { hasText: 'Backstory' }).locator('textarea').fill('Raised in a border fort with maps on every wall.')
      await page.locator('.text-card', { hasText: 'Features' }).locator('textarea').fill('Favored Foe, Natural Explorer, Extra Attack, Field Notes')
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-story-edited-desktop.png', { fullPage: true })

      await page.getByRole('button', { name: 'Inventory' }).click()
      await page.getByRole('button', { name: 'Add Item' }).click()
      await page.locator('.inventory-row').last().locator('input[aria-label="Item"]').fill('Compass')
      await page.locator('.inventory-row').last().locator('input[aria-label="Qty"]').fill('2')
      await page.locator('.inventory-row').last().locator('input[aria-label="Weight"]').fill('1.5')
      await page.locator('.inventory-row').last().locator('input[aria-label="Value"]').fill('75 gp')
      await page.getByRole('button', { name: 'Notes' }).click()
      await page.getByRole('button', { name: 'Add Note' }).click()
      await page.getByLabel('Session note title').first().fill('Ash arrowheads')
      await page.getByLabel('Session note body').first().fill('Ask the smith about the ash-covered arrowheads.')
      await expect(page).toHaveScreenshot('charberry-notes-edited-desktop.png', { fullPage: true })

      await expect.poll(() => {
        const active = readSavedLibrary(libraryPath).characters[0]
        return {
          ac: active.armorClass,
          currentHp: active.hpCurrent,
          tempHp: active.hpTemp,
          inspiration: active.inspiration,
          spellAbility: active.spellcastingAbility,
          wisSave: active.savingThrows.wis,
          personality: active.personality,
          inventory: active.inventory,
          inventoryItem: active.inventoryItems.at(-1)?.name,
          note: active.sessionNotes[0]?.title,
        }
      }).toEqual({
        ac: 18,
        currentHp: 31,
        tempHp: 6,
        inspiration: true,
        spellAbility: 'int',
        wisSave: true,
        personality: 'Speaks softly before drawing a blade.',
        inventory: 'Explorer pack, Longbow, Shortsword, 2x Compass',
        inventoryItem: 'Compass',
        note: 'Ash arrowheads',
      })
    } finally {
      await app.close()
    }
  })

  test('normalizes damaged data before rendering and saving', async ({}, testInfo) => {
    const damaged = {
      version: 1,
      activeCharacterId: 'missing',
      characters: [{
        id: 'broken',
        name: '',
        level: 99,
        abilityScores: { str: -2, dex: 44, con: 14 },
        savingThrows: { str: 1 },
        skills: { stealth: 'expertise', perception: 'bad' },
        hpMax: 'wrong',
        attacks: [{ id: 4, name: 10 }],
        spells: [{ level: 12, prepared: 1 }],
      }],
      settings: { locale: 'en', theme: 'dark' },
    } as never
    const { app, page, libraryPath } = await launchCharBerry(testInfo, { library: damaged })
    try {
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Unnamed Character')
      await expect(page.getByLabel('Level', { exact: true })).toHaveValue('20')
      await expect(page.locator('.ability-box', { hasText: 'STR' }).locator('input')).toHaveValue('1')
      await expect(page.locator('.ability-box', { hasText: 'DEX' }).locator('input')).toHaveValue('30')
      const saved = readSavedLibrary(libraryPath)
      expect(saved.activeCharacterId).toBe('broken')
      expect(saved.characters[0].level).toBe(20)
      expect(saved.characters[0].abilityScores.str).toBe(1)
      expect(saved.characters[0].abilityScores.dex).toBe(30)
      expect(saved.characters[0].skills.perception).toBe('none')
    } finally {
      await app.close()
    }
  })

  test('keeps desktop and narrow layouts bounded and screenshot-stable', async ({}, testInfo) => {
    const { app, page } = await launchCharBerry(testInfo)
    try {
      await assertVisibleLayout(page)
      await page.getByRole('button', { name: 'Story' }).click()
      await expect(page).toHaveScreenshot('charberry-story-desktop.png', { fullPage: true })

      await page.setViewportSize({ width: 900, height: 980 })
      await page.waitForTimeout(100)
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-responsive.png', { fullPage: true })

      await page.getByRole('button', { name: 'Combat' }).click()
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-combat-responsive.png', { fullPage: true })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(100)
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-mobile-390.png', { fullPage: true })
    } finally {
      await app.close()
    }
  })

  test('supports German UI, SRD creator, structured inventory/session notes, and context menus', async ({}, testInfo) => {
    const { app, page, libraryPath } = await launchCharBerry(testInfo)
    try {
      await page.getByRole('button', { name: 'Settings' }).click()
      await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
      await expect(page.getByLabel('Language')).toHaveValue('en')
      await expect(page.getByLabel('Theme')).toHaveValue('dark')
      await expect(page.getByRole('button', { name: 'kontakt@rollberry.de' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'GitHub repository' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'RollBerry Studios on GitHub' })).toBeVisible()
      await expect(page).toHaveScreenshot('charberry-settings-dark-en.png', { fullPage: true })
      await page.getByLabel('Theme').selectOption('light')
      await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'light')
      await page.getByLabel('Theme').selectOption('dark')
      await page.getByLabel('Language').selectOption('de')
      await page.getByRole('button', { name: 'Schließen' }).click()
      await expect(page.getByRole('heading', { name: 'Charaktere' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Assistent' })).toBeVisible()
      await page.locator('.action-menu summary').click()
      await expect(page.getByRole('button', { name: 'DDB-JSON importieren' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Bridge-JSON exportieren' })).toBeVisible()
      await page.locator('.action-menu summary').click()
      await page.getByRole('button', { name: 'Assistent' }).click()
      await expect(page.getByRole('dialog', { name: /Charakter-Assistent/ })).toBeVisible()
      await page.getByRole('dialog').locator('select').nth(1).selectOption('Wizard')
      await page.getByRole('dialog').locator('select').nth(0).selectOption('Elf')
      await page.getByRole('dialog').locator('select').nth(2).selectOption('Sage')
      await page.getByLabel('Attributsmethode').selectOption('pointBuy')
      await expect(page.locator('.point-buy-panel')).toContainText('Punkte übrig: 0')
      await expect(page.locator('.wizard-preview')).toContainText('Zauberwirken')
      await page.getByRole('button', { name: 'Assistent anwenden' }).click()
      await expect(page.getByLabel('Class', { exact: true })).toHaveValue('Wizard')
      await expect(page.getByLabel('Ancestry')).toHaveValue('Elf')

      await page.getByRole('button', { name: 'Inventar' }).click()
      await page.getByRole('button', { name: 'Gegenstand hinzufügen' }).click()
      await page.locator('.inventory-row').last().locator('input[aria-label="Gegenstand"]').fill('Spellbook')
      await page.locator('.inventory-row').last().locator('input[aria-label="Gegenstand"]').click({ button: 'right' })
      await expect(page.getByRole('menu', { name: 'Aktionsmenü' })).toBeVisible()
      await page.getByRole('button', { name: 'Duplizieren' }).click()
      await expect.poll(() => page.locator('.inventory-row input[aria-label="Gegenstand"]').evaluateAll((inputs) => inputs.filter((input) => (input as HTMLInputElement).value === 'Spellbook').length)).toBe(2)
      await page.getByRole('button', { name: 'Notizen' }).click()
      await page.getByRole('button', { name: 'Notiz hinzufügen' }).click()
      await page.getByLabel('Session note title').first().fill('Erste Sitzung')
      await assertVisibleLayout(page)
      await assertNoUnexpectedOverlaps(page)
      await expect(page).toHaveScreenshot('charberry-german-wizard-notes-desktop.png', { fullPage: true })

      await expect.poll(() => {
        const saved = readSavedLibrary(libraryPath)
        const active = saved.characters[0]
        return {
          locale: saved.settings?.locale,
          theme: saved.settings?.theme,
          className: active.className,
          ancestry: active.ancestry,
          features: active.features,
          spellbooks: active.inventoryItems.filter((item) => item.name === 'Spellbook').length,
          note: active.sessionNotes[0]?.title,
        }
      }).toEqual({ locale: 'de', theme: 'dark', className: 'Wizard', ancestry: 'Elf', features: expect.stringContaining('Zauberwirken'), spellbooks: 2, note: 'Erste Sitzung' })
    } finally {
      await app.close()
    }
  })
})

function multiCharacterLibrary(): CharacterLibrary {
  const base = sampleLibrary()
  return {
    ...base,
    characters: [
      base.characters[0],
      {
        ...base.characters[0],
        id: 'char-mira',
        name: 'Mira Vale',
        ancestry: 'Human',
        className: 'Wizard',
        subclass: 'Scribe',
        level: 4,
        background: 'Sage',
        abilityScores: { str: 8, dex: 14, con: 12, int: 18, wis: 13, cha: 10 },
        spellcastingAbility: 'int',
      },
      {
        ...base.characters[0],
        id: 'char-caldus',
        name: 'Brother Caldus',
        ancestry: 'Dwarf',
        className: 'Cleric',
        subclass: 'Forge Domain',
        level: 6,
        background: 'Guild Artisan',
        abilityScores: { str: 14, dex: 10, con: 16, int: 11, wis: 18, cha: 12 },
        spellcastingAbility: 'wis',
      },
    ],
  }
}

async function assertVisibleLayout(page: import('@playwright/test').Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const selectors = ['.titlebar', '.brand', '.char-layout', '.roster-panel', '.sheet-panel', '.hero-sheet', '.derived-strip', '.tabs', '.card', 'button', 'input', 'select', 'textarea']
    const result: string[] = []
    const seen = new Set<Element>()
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (seen.has(element)) continue
        seen.add(element)
        if (element.closest('details:not([open])')) continue
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const rect = element.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) result.push(`${selector} has empty bounds`)
        if (rect.left < -1 || rect.right > viewport.width + 1) result.push(`${selector} overflows horizontally`)
        if (element instanceof HTMLButtonElement && element.scrollWidth > element.clientWidth + 2) result.push(`button text clips: ${element.textContent?.trim()}`)
      }
    }
    return result
  })
  expect(failures).toEqual([])
}

async function setRange(page: import('@playwright/test').Page, label: string, value: number): Promise<void> {
  await page.getByLabel(label).evaluate((input, nextValue) => {
    const range = input as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(range, String(nextValue))
    range.dispatchEvent(new Event('input', { bubbles: true }))
    range.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function assertNoUnexpectedOverlaps(page: import('@playwright/test').Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const groups = [
      '.titlebar > *',
      '.derived-strip > .stat',
      '.tabs > button',
      '.overview-grid > .card',
      '.combat-grid > .card',
      '.skills-grid > .card',
      '.story-grid > .card',
      '.notes-grid > .card',
      '.identity-grid > label',
      '.form-grid > label',
      '.ability-grid > .ability-box',
      '.skill-table > .skill-row',
      '.save-grid > .save-row',
      '.attack-row > *',
      '.spell-row > *',
    ]
    const result: string[] = []
    function visibleRect(element: Element): DOMRect | null {
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return null
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      return rect
    }
    function overlap(a: DOMRect, b: DOMRect): boolean {
      return Math.max(a.left, b.left) < Math.min(a.right, b.right) - 1 && Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom) - 1
    }
    for (const group of groups) {
      const items = Array.from(document.querySelectorAll(group))
        .map((element) => ({ element, rect: visibleRect(element) }))
        .filter((item): item is { element: Element; rect: DOMRect } => item.rect !== null)
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (overlap(items[i].rect, items[j].rect)) {
            result.push(`${group} overlap: "${items[i].element.textContent?.trim().slice(0, 30)}" with "${items[j].element.textContent?.trim().slice(0, 30)}"`)
          }
        }
      }
    }
    return result
  })
  expect(failures).toEqual([])
}
