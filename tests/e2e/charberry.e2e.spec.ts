import { expect, test } from '@playwright/test'
import { launchCharBerry, readSavedLibrary, sampleLibrary } from './helpers/charberryApp'

test.describe('CharBerry Electron QA', () => {
  test('renders the character library and responsive sheet without broken controls', async ({}, testInfo) => {
    const { app, page } = await launchCharBerry(testInfo)
    try {
      await expect(page).toHaveTitle('CharBerry')
      await expect(page.locator('.brand img')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
      await expect(page.getByText('Aster Rowan')).toBeVisible()
      await expect(page.getByText('Level 5 Half-Elf Ranger')).toBeVisible()
      await expect(page.getByText('Passive Perception')).toBeVisible()
      await expect(page.getByText('Spell DC')).toBeVisible()
      await expect(page.locator('.ability-box')).toHaveCount(6)
      await expect(page).toHaveScreenshot('charberry-character-overview.png', { fullPage: true })
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
      await page.getByLabel('Attack name').fill('Fire Bolt')
      await page.getByLabel('Attack bonus').fill('+5')
      await page.getByLabel('Attack damage').fill('1d10')
      await page.getByRole('button', { name: 'Add Spell' }).click()
      await page.getByLabel('Spell name').fill('Shield')
      await page.getByLabel('Spell level').fill('1')

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
      await expect(page).toHaveScreenshot('charberry-responsive.png', { fullPage: true })
    } finally {
      await app.close()
    }
  })
})

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
