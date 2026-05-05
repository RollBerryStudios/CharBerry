import { _electron as electron, type ElectronApplication, type Page, type TestInfo } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type SkillRank = 'none' | 'proficient' | 'expertise'

export interface CharacterSheet {
  id: string
  name: string
  ancestry: string
  className: string
  subclass: string
  level: number
  background: string
  alignment: string
  xp: number
  abilityScores: Record<AbilityKey, number>
  savingThrows: Record<AbilityKey, boolean>
  skills: Record<string, SkillRank>
  hpMax: number
  hpCurrent: number
  hpTemp: number
  armorClass: number
  speed: number
  initiativeBonus: number
  spellcastingAbility: AbilityKey
  hitDice: string
  inspiration: boolean
  portraitDataUrl: string
  attacks: Array<{ id: string; name: string; bonus: string; damage: string; damageType: string; range: string; notes: string }>
  spells: Array<{ id: string; level: number; name: string; prepared: boolean; notes: string }>
  inventory: string
  inventoryItems: Array<{ id: string; name: string; quantity: number; weight: number; value: string; equipped: boolean; notes: string }>
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number }
  features: string
  personality: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  notes: string
  sessionNotes: Array<{ id: string; date: string; title: string; body: string; tags: string[] }>
  updatedAt: string
}

export interface CharacterLibrary {
  version: 1
  activeCharacterId: string | null
  characters: CharacterSheet[]
  settings?: { locale: 'en' | 'de' }
}

export interface LaunchedCharBerry {
  app: ElectronApplication
  page: Page
  userDataDir: string
  libraryPath: string
}

const APP_ENTRY = resolve(process.cwd(), 'dist/main/main.js')

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

export function sampleLibrary(): CharacterLibrary {
  const character: CharacterSheet = {
    id: 'char-aster',
    name: 'Aster Rowan',
    ancestry: 'Half-Elf',
    className: 'Ranger',
    subclass: 'Gloom Stalker',
    level: 5,
    background: 'Outlander',
    alignment: 'Neutral Good',
    xp: 6500,
    abilityScores: { str: 10, dex: 18, con: 14, int: 12, wis: 16, cha: 11 },
    savingThrows: { str: true, dex: true, con: false, int: false, wis: false, cha: false },
    skills: {
      acrobatics: 'proficient',
      animalHandling: 'none',
      arcana: 'none',
      athletics: 'none',
      deception: 'none',
      history: 'none',
      insight: 'none',
      intimidation: 'none',
      investigation: 'proficient',
      medicine: 'none',
      nature: 'none',
      perception: 'proficient',
      performance: 'none',
      persuasion: 'none',
      religion: 'none',
      sleightOfHand: 'none',
      stealth: 'expertise',
      survival: 'proficient',
    },
    hpMax: 44,
    hpCurrent: 38,
    hpTemp: 0,
    armorClass: 16,
    speed: 30,
    initiativeBonus: 0,
    spellcastingAbility: 'wis',
    hitDice: '5d10',
    inspiration: false,
    portraitDataUrl: '',
    attacks: [
      { id: 'atk-bow', name: 'Longbow', bonus: '+7', damage: '1d8+4', damageType: 'piercing', range: '150/600', notes: '' },
    ],
    spells: [
      { id: 'spell-pass', level: 2, name: 'Pass without trace', prepared: true, notes: '+10 stealth aura.' },
    ],
    inventory: 'Explorer pack, longbow, shortsword',
    inventoryItems: [
      { id: 'item-pack', name: 'Explorer pack', quantity: 1, weight: 59, value: '10 gp', equipped: false, notes: '' },
      { id: 'item-bow', name: 'Longbow', quantity: 1, weight: 2, value: '50 gp', equipped: true, notes: '' },
      { id: 'item-sword', name: 'Shortsword', quantity: 1, weight: 2, value: '10 gp', equipped: true, notes: '' },
    ],
    currency: { cp: 0, sp: 0, ep: 0, gp: 22, pp: 0 },
    features: 'Favored Enemy, Natural Explorer, Extra Attack',
    personality: 'Quietly maps every exit.',
    ideals: 'No one gets left behind.',
    bonds: '',
    flaws: '',
    backstory: 'Raised between cities and deep pine roads.',
    notes: 'Tracks enemy movement.',
    sessionNotes: [{ id: 'note-track', date: '2026-05-05', title: 'Trail signs', body: 'Tracks enemy movement.', tags: ['session'] }],
    updatedAt: '2026-05-05T10:00:00.000Z',
  }
  return { version: 1, activeCharacterId: character.id, characters: [character], settings: { locale: 'en' } }
}

export function prepareUserData(userDataDir: string, library: CharacterLibrary = sampleLibrary()): string {
  rmSync(userDataDir, { recursive: true, force: true })
  const dataDir = join(userDataDir, 'data')
  ensureDir(dataDir)
  const libraryPath = join(dataDir, 'charberry-library.json')
  writeFileSync(libraryPath, JSON.stringify(library, null, 2), 'utf8')
  return libraryPath
}

export async function launchCharBerry(testInfo: TestInfo, options: { library?: CharacterLibrary; viewport?: { width: number; height: number } } = {}): Promise<LaunchedCharBerry> {
  const userDataDir = join(testInfo.outputDir, 'user-data')
  const libraryPath = prepareUserData(userDataDir, options.library ?? sampleLibrary())
  const app = await electron.launch({
    args: [APP_ENTRY],
    env: {
      ...process.env,
      CHARBERRY_E2E_USER_DATA: userDataDir,
    },
  })
  const page = await app.firstWindow()
  await page.setViewportSize(options.viewport ?? { width: 1440, height: 940 })
  await page.waitForSelector('.app-shell')
  await page.addStyleTag({ content: '* { caret-color: transparent !important; transition: none !important; animation: none !important; }' })
  return { app, page, userDataDir, libraryPath }
}

export function readSavedLibrary(libraryPath: string): CharacterLibrary {
  return JSON.parse(readFileSync(libraryPath, 'utf8')) as CharacterLibrary
}
