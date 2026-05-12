import { app, BrowserWindow, dialog, ipcMain, shell, session, type IpcMainInvokeEvent, type MessageBoxOptions, type OpenDialogOptions } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { extname, join, resolve } from 'path'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
type SkillRank = 'none' | 'proficient' | 'expertise'
type Locale = 'en' | 'de'
type Theme = 'dark' | 'light'

interface CharacterAttack {
  id: string
  name: string
  bonus: string
  damage: string
  damageType: string
  range: string
  notes: string
}

interface CharacterSpell {
  id: string
  level: number
  name: string
  damage: string
  range: string
  prepared: boolean
  notes: string
}

interface CharacterInventoryItem {
  id: string
  name: string
  quantity: number
  weight: number
  value: string
  equipped: boolean
  notes: string
}

interface CharacterSessionNote {
  id: string
  date: string
  title: string
  body: string
  tags: string[]
}

interface CharacterResource {
  id: string
  name: string
  current: number
  max: number
  reset: 'short' | 'long' | 'manual'
}

interface CharacterSheet {
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
  conditions: string[]
  resources: CharacterResource[]
  portraitDataUrl: string
  portraitZoom: number
  portraitOffsetX: number
  portraitOffsetY: number
  attacks: CharacterAttack[]
  spells: CharacterSpell[]
  inventory: string
  inventoryItems: CharacterInventoryItem[]
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number }
  features: string
  personality: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  notes: string
  sessionNotes: CharacterSessionNote[]
  updatedAt: string
}

interface CharacterLibrary {
  version: 1
  activeCharacterId: string | null
  characters: CharacterSheet[]
  settings?: { locale: Locale; theme?: Theme }
}

const isDev = process.env.NODE_ENV === 'development'
const RENDERER_URL = 'http://localhost:5175'
const APP_NAME = 'CharBerry'
const DATA_FILE = 'charberry-library.json'

app.setName(APP_NAME)
if (process.env.CHARBERRY_E2E_USER_DATA) {
  app.setPath('userData', resolve(process.env.CHARBERRY_E2E_USER_DATA))
}

let mainWindow: BrowserWindow | null = null

function appRoot(): string {
  const cwd = process.cwd()
  if (existsSync(join(cwd, 'dist/renderer')) || existsSync(join(cwd, 'package.json'))) return cwd
  return app.getAppPath()
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function userDataPath(): string {
  return app.getPath('userData')
}

function libraryPath(): string {
  const dir = join(userDataPath(), 'data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, DATA_FILE)
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function bools(value: unknown): Record<AbilityKey, boolean> {
  const parsed = value && typeof value === 'object' ? value as Partial<Record<AbilityKey, boolean>> : {}
  return {
    str: Boolean(parsed.str),
    dex: Boolean(parsed.dex),
    con: Boolean(parsed.con),
    int: Boolean(parsed.int),
    wis: Boolean(parsed.wis),
    cha: Boolean(parsed.cha),
  }
}

function abilityScores(value: unknown): Record<AbilityKey, number> {
  const parsed = value && typeof value === 'object' ? value as Partial<Record<AbilityKey, number>> : {}
  return {
    str: clampInt(parsed.str, 1, 30, 10),
    dex: clampInt(parsed.dex, 1, 30, 10),
    con: clampInt(parsed.con, 1, 30, 10),
    int: clampInt(parsed.int, 1, 30, 10),
    wis: clampInt(parsed.wis, 1, 30, 10),
    cha: clampInt(parsed.cha, 1, 30, 10),
  }
}

function skillRank(value: unknown): SkillRank {
  return value === 'proficient' || value === 'expertise' ? value : 'none'
}

function locale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'de'
}

function theme(value: unknown): Theme {
  return value === 'light' ? 'light' : 'dark'
}

function money(value: unknown): { cp: number; sp: number; ep: number; gp: number; pp: number } {
  const parsed = value && typeof value === 'object' ? value as Partial<Record<'cp' | 'sp' | 'ep' | 'gp' | 'pp', number>> : {}
  return {
    cp: clampInt(parsed.cp, 0, 999_999, 0),
    sp: clampInt(parsed.sp, 0, 999_999, 0),
    ep: clampInt(parsed.ep, 0, 999_999, 0),
    gp: clampInt(parsed.gp, 0, 999_999, 0),
    pp: clampInt(parsed.pp, 0, 999_999, 0),
  }
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((tag) => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean))).slice(0, 12)
}

function skills(value: unknown): Record<string, SkillRank> {
  const parsed = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const keys = [
    'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history',
    'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
    'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival',
  ]
  return Object.fromEntries(keys.map((key) => [key, skillRank(parsed[key])])) as Record<string, SkillRank>
}

function normalizeAttack(value: unknown): CharacterAttack | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterAttack>
  return {
    id: text(parsed.id, makeId()),
    name: text(parsed.name, 'Angriff'),
    bonus: text(parsed.bonus),
    damage: text(parsed.damage),
    damageType: text(parsed.damageType),
    range: text(parsed.range),
    notes: text(parsed.notes),
  }
}

function normalizeSpell(value: unknown): CharacterSpell | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterSpell>
  return {
    id: text(parsed.id, makeId()),
    level: clampInt(parsed.level, 0, 9, 0),
    name: text(parsed.name, 'Zauber'),
    damage: text(parsed.damage),
    range: text(parsed.range),
    prepared: Boolean(parsed.prepared),
    notes: text(parsed.notes),
  }
}

function normalizeInventoryItem(value: unknown): CharacterInventoryItem | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterInventoryItem>
  const name = text(parsed.name).trim()
  if (!name) return null
  return {
    id: text(parsed.id, makeId()),
    name,
    quantity: clampInt(parsed.quantity, 1, 9999, 1),
    weight: typeof parsed.weight === 'number' && Number.isFinite(parsed.weight) ? Math.max(0, Math.min(9999, parsed.weight)) : 0,
    value: text(parsed.value),
    equipped: Boolean(parsed.equipped),
    notes: text(parsed.notes),
  }
}

function legacyInventoryItems(value: unknown): CharacterInventoryItem[] {
  const raw = text(value).trim()
  if (!raw) return []
  return raw.split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((name) => ({ id: makeId(), name, quantity: 1, weight: 0, value: '', equipped: false, notes: '' }))
}

function normalizeSessionNote(value: unknown): CharacterSessionNote | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterSessionNote>
  return {
    id: text(parsed.id, makeId()),
    date: text(parsed.date, new Date().toISOString().slice(0, 10)),
    title: text(parsed.title, 'Sitzungsnotiz').trim() || 'Sitzungsnotiz',
    body: text(parsed.body),
    tags: tags(parsed.tags),
  }
}

function normalizeResource(value: unknown): CharacterResource | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterResource>
  const max = clampInt(parsed.max, 0, 99, 1)
  const reset = parsed.reset === 'short' || parsed.reset === 'long' ? parsed.reset : 'manual'
  return {
    id: text(parsed.id, makeId()),
    name: text(parsed.name, 'Ressource').trim() || 'Ressource',
    current: clampInt(parsed.current, 0, max, max),
    max,
    reset,
  }
}

function legacySessionNotes(value: unknown): CharacterSessionNote[] {
  const body = text(value).trim()
  if (!body) return []
  return [{ id: makeId(), date: new Date().toISOString().slice(0, 10), title: 'Importierte Notizen', body, tags: ['legacy'] }]
}

function emptyCharacter(): CharacterSheet {
  const now = new Date().toISOString()
  return {
    id: makeId(),
    name: 'Neuer Held',
    ancestry: 'Mensch',
    className: 'Kämpfer',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    xp: 0,
    abilityScores: { str: 15, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    savingThrows: { str: true, dex: false, con: true, int: false, wis: false, cha: false },
    skills: skills({ athletics: 'proficient', perception: 'proficient' }),
    hpMax: 12,
    hpCurrent: 12,
    hpTemp: 0,
    armorClass: 16,
    speed: 30,
    initiativeBonus: 0,
    spellcastingAbility: 'cha',
    hitDice: '1d10',
    inspiration: false,
    conditions: [],
    resources: [
      { id: makeId(), name: 'Durchatmen', current: 1, max: 1, reset: 'short' },
      { id: makeId(), name: 'Trefferwürfel', current: 1, max: 1, reset: 'long' },
    ],
    portraitDataUrl: '',
    portraitZoom: 1,
    portraitOffsetX: 0,
    portraitOffsetY: 0,
    attacks: [{ id: makeId(), name: 'Langschwert', bonus: '+4', damage: '1W8+2', damageType: 'Hiebschaden', range: '1,5 m', notes: '' }],
    spells: [],
    inventory: 'Entdeckerpaket, Schild, Langschwert',
    inventoryItems: [
      { id: makeId(), name: 'Entdeckerpaket', quantity: 1, weight: 59, value: '10 GM', equipped: false, notes: '' },
      { id: makeId(), name: 'Schild', quantity: 1, weight: 6, value: '10 GM', equipped: true, notes: '+2 RK ausgerüstet' },
      { id: makeId(), name: 'Langschwert', quantity: 1, weight: 3, value: '15 GM', equipped: true, notes: '' },
    ],
    currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
    features: 'Kampfstil, Durchatmen',
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    notes: '',
    sessionNotes: [],
    updatedAt: now,
  }
}

function normalizeCharacter(value: unknown): CharacterSheet | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Partial<CharacterSheet>
  const activeAbility: AbilityKey = ['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(String(parsed.spellcastingAbility))
    ? parsed.spellcastingAbility as AbilityKey
    : 'cha'
  return {
    ...emptyCharacter(),
    id: text(parsed.id, makeId()),
    name: text(parsed.name, 'Unnamed Character').trim() || 'Unnamed Character',
    ancestry: text(parsed.ancestry),
    className: text(parsed.className),
    subclass: text(parsed.subclass),
    level: clampInt(parsed.level, 1, 20, 1),
    background: text(parsed.background),
    alignment: text(parsed.alignment),
    xp: clampInt(parsed.xp, 0, 1_000_000, 0),
    abilityScores: abilityScores(parsed.abilityScores),
    savingThrows: bools(parsed.savingThrows),
    skills: skills(parsed.skills),
    hpMax: clampInt(parsed.hpMax, 0, 999, 0),
    hpCurrent: clampInt(parsed.hpCurrent, 0, 999, 0),
    hpTemp: clampInt(parsed.hpTemp, 0, 999, 0),
    armorClass: clampInt(parsed.armorClass, 0, 99, 10),
    speed: clampInt(parsed.speed, 0, 300, 30),
    initiativeBonus: clampInt(parsed.initiativeBonus, -99, 99, 0),
    spellcastingAbility: activeAbility,
    hitDice: text(parsed.hitDice),
    inspiration: Boolean(parsed.inspiration),
    conditions: tags(parsed.conditions).slice(0, 16),
    resources: Array.isArray(parsed.resources) ? parsed.resources.map(normalizeResource).filter(Boolean) as CharacterResource[] : [],
    portraitDataUrl: text(parsed.portraitDataUrl),
    portraitZoom: typeof parsed.portraitZoom === 'number' && Number.isFinite(parsed.portraitZoom)
      ? Math.max(1, Math.min(2.5, parsed.portraitZoom))
      : 1,
    portraitOffsetX: typeof parsed.portraitOffsetX === 'number' && Number.isFinite(parsed.portraitOffsetX)
      ? Math.max(-50, Math.min(50, parsed.portraitOffsetX))
      : 0,
    portraitOffsetY: typeof parsed.portraitOffsetY === 'number' && Number.isFinite(parsed.portraitOffsetY)
      ? Math.max(-50, Math.min(50, parsed.portraitOffsetY))
      : 0,
    attacks: Array.isArray(parsed.attacks) ? parsed.attacks.map(normalizeAttack).filter(Boolean) as CharacterAttack[] : [],
    spells: Array.isArray(parsed.spells) ? parsed.spells.map(normalizeSpell).filter(Boolean) as CharacterSpell[] : [],
    inventory: text(parsed.inventory),
    inventoryItems: Array.isArray(parsed.inventoryItems)
      ? parsed.inventoryItems.map(normalizeInventoryItem).filter(Boolean) as CharacterInventoryItem[]
      : legacyInventoryItems(parsed.inventory),
    currency: money(parsed.currency),
    features: text(parsed.features),
    personality: text(parsed.personality),
    ideals: text(parsed.ideals),
    bonds: text(parsed.bonds),
    flaws: text(parsed.flaws),
    backstory: text(parsed.backstory),
    notes: text(parsed.notes),
    sessionNotes: Array.isArray(parsed.sessionNotes)
      ? parsed.sessionNotes.map(normalizeSessionNote).filter(Boolean) as CharacterSessionNote[]
      : legacySessionNotes(parsed.notes),
    updatedAt: text(parsed.updatedAt, new Date().toISOString()),
  }
}

function defaultLibrary(): CharacterLibrary {
  const kara = emptyCharacter()
  kara.name = 'Kara Steinfaust'
  kara.ancestry = 'Goliath'
  kara.className = 'Barbar'
  kara.background = 'Soldat'
  kara.alignment = 'Chaotisch Neutral'
  kara.level = 5
  kara.xp = 6500
  kara.abilityScores = { str: 18, dex: 13, con: 16, int: 8, wis: 12, cha: 10 }
  kara.skills = skills({ athletics: 'proficient', intimidation: 'proficient', perception: 'proficient', survival: 'proficient' })
  kara.savingThrows = { str: true, dex: false, con: true, int: false, wis: false, cha: false }
  kara.hpMax = 50
  kara.hpCurrent = 44
  kara.armorClass = 13
  kara.hitDice = '5W12'
  kara.resources = [
    { id: makeId(), name: 'Wut', current: 3, max: 3, reset: 'long' },
    { id: makeId(), name: 'Trefferwürfel', current: 5, max: 5, reset: 'long' },
  ]
  kara.attacks = [
    { id: makeId(), name: 'Großaxt', bonus: '+7', damage: '1W12+4', damageType: 'Hiebschaden', range: '1,5 m', notes: 'Wut: +2 Schaden' },
    { id: makeId(), name: 'Handaxt', bonus: '+7', damage: '1W6+4', damageType: 'Hiebschaden', range: 'Wurfwaffe', notes: '' },
  ]
  kara.inventory = 'Großaxt, 2x Handäxte, Entdeckerpaket, Reisekleidung, Rangabzeichen, Würfelset'
  kara.inventoryItems = [
    { id: makeId(), name: 'Großaxt', quantity: 1, weight: 7, value: '30 GM', equipped: true, notes: '' },
    { id: makeId(), name: 'Handaxt', quantity: 2, weight: 2, value: '5 GM', equipped: true, notes: 'Wurfwaffe' },
    { id: makeId(), name: 'Entdeckerpaket', quantity: 1, weight: 59, value: '10 GM', equipped: false, notes: '' },
  ]
  kara.currency = { cp: 0, sp: 0, ep: 0, gp: 9, pp: 0 }
  kara.features = 'Wut, Ungerüstete Verteidigung, Waffenmeisterschaft, Wilder Angreifer'
  kara.personality = 'Kurz angebunden, laut, ehrlich; sucht immer den direkten Weg.'
  kara.ideals = 'Ehre. Ich lasse niemanden zurück, der unter meinem Banner stand.'
  kara.bonds = 'Meine alte Einheit hat mir das Leben gerettet.'
  kara.flaws = 'Ich überschätze oft meine Unverwundbarkeit und stürme zu weit vor.'
  kara.backstory = 'Veteranin vieler Grenzgefechte, die Konflikte lieber direkt löst.'
  kara.sessionNotes = [{ id: makeId(), date: '2026-05-12', title: 'Frontlinie', body: 'Kara hält Engstellen und zieht Aufmerksamkeit auf sich.', tags: ['kampf'] }]

  const lysandra = emptyCharacter()
  lysandra.name = 'Lysandra Federkiel'
  lysandra.ancestry = 'Elf'
  lysandra.className = 'Barde'
  lysandra.subclass = 'Kollegium der Lehre'
  lysandra.background = 'Gelehrter'
  lysandra.alignment = 'Neutral Gut'
  lysandra.level = 5
  lysandra.xp = 6500
  lysandra.abilityScores = { str: 8, dex: 14, con: 13, int: 13, wis: 10, cha: 18 }
  lysandra.skills = skills({ arcana: 'proficient', history: 'proficient', insight: 'proficient', performance: 'expertise', persuasion: 'expertise' })
  lysandra.savingThrows = { str: false, dex: true, con: false, int: false, wis: false, cha: true }
  lysandra.hpMax = 33
  lysandra.hpCurrent = 29
  lysandra.armorClass = 13
  lysandra.spellcastingAbility = 'cha'
  lysandra.hitDice = '5W8'
  lysandra.resources = [
    { id: makeId(), name: 'Bardische Inspiration', current: 4, max: 4, reset: 'short' },
    { id: makeId(), name: 'Trefferwürfel', current: 5, max: 5, reset: 'long' },
  ]
  lysandra.attacks = [
    { id: makeId(), name: 'Rapier', bonus: '+5', damage: '1W8+2', damageType: 'Stichschaden', range: '1,5 m', notes: '' },
    { id: makeId(), name: 'Leichte Armbrust', bonus: '+5', damage: '1W8+2', damageType: 'Stichschaden', range: '24/96 m', notes: '' },
  ]
  lysandra.spells = [
    { id: makeId(), level: 0, name: 'Spott', damage: '', range: '18 m', prepared: true, notes: 'Weisheitswurf gegen Zauber-SG' },
    { id: makeId(), level: 1, name: 'Heilendes Wort', damage: '1W4+4', range: '18 m', prepared: true, notes: 'Bonusaktion' },
  ]
  lysandra.inventory = 'Lederrüstung, Rapier, Leichte Armbrust, Laute, Gelehrtenpaket, Tinte & Federkiel'
  lysandra.inventoryItems = [
    { id: makeId(), name: 'Rapier', quantity: 1, weight: 2, value: '25 GM', equipped: true, notes: '' },
    { id: makeId(), name: 'Laute', quantity: 1, weight: 2, value: '35 GM', equipped: false, notes: 'Fokus und Bühnenwerkzeug' },
    { id: makeId(), name: 'Buch des Wissens', quantity: 1, weight: 3, value: '', equipped: false, notes: 'Mentorenhinweise' },
  ]
  lysandra.currency = { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }
  lysandra.features = 'Zauberwirken, Bardische Inspiration, Expertise, Lied der Erholung'
  lysandra.personality = 'Neugierig, charmant, sammelt Geheimnisse wie andere Münzen.'
  lysandra.ideals = 'Wissen. Wahrheit ist Macht - und Macht gehört in gute Hände.'
  lysandra.bonds = 'Mein Mentor verschwand bei der Suche nach einem verlorenen Codex.'
  lysandra.flaws = 'Ich kann nicht widerstehen, eine zu gute Geschichte auszuschmücken.'
  lysandra.backstory = 'Elfische Wortkünstlerin, die Wissen in Klingen verwandelt.'
  lysandra.sessionNotes = [{ id: makeId(), date: '2026-05-12', title: 'Verlorener Codex', body: 'Lysandra prüft jede Spur zu ihrem Mentor.', tags: ['story'] }]

  return { version: 1, activeCharacterId: kara.id, characters: [kara, lysandra], settings: { locale: 'de', theme: 'dark' } }
}

function normalizeLibrary(value: unknown): CharacterLibrary {
  if (!value || typeof value !== 'object') return defaultLibrary()
  const parsed = value as Partial<CharacterLibrary>
  if (parsed.version !== 1) return defaultLibrary()
  const characters = Array.isArray(parsed.characters)
    ? parsed.characters.map(normalizeCharacter).filter(Boolean) as CharacterSheet[]
    : []
  if (characters.length === 0) return defaultLibrary()
  const activeCharacterId = typeof parsed.activeCharacterId === 'string' && characters.some((character) => character.id === parsed.activeCharacterId)
    ? parsed.activeCharacterId
    : characters[0].id
  return { version: 1, characters, activeCharacterId, settings: { locale: locale(parsed.settings?.locale), theme: theme(parsed.settings?.theme) } }
}

function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol === 'mailto:' && url.pathname === 'kontakt@rollberry.de') return url.toString()
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null
    if (url.pathname !== '/RollBerryStudios' && !url.pathname.startsWith('/RollBerryStudios/')) return null
    return url.toString()
  } catch {
    return null
  }
}

function loadLibrary(): CharacterLibrary {
  const path = libraryPath()
  if (!existsSync(path)) return defaultLibrary()
  try {
    const normalized = normalizeLibrary(JSON.parse(readFileSync(path, 'utf8')))
    writeFileSync(path, JSON.stringify(normalized, null, 2), 'utf8')
    return normalized
  } catch {
    return defaultLibrary()
  }
}

function saveLibrary(library: CharacterLibrary): boolean {
  writeFileSync(libraryPath(), JSON.stringify(normalizeLibrary(library), null, 2), 'utf8')
  return true
}

function ownerWindow(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender) ?? mainWindow
}

function imageMime(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

function registerIpc(): void {
  ipcMain.handle('charberry:library-load', () => loadLibrary())
  ipcMain.handle('charberry:library-save', (_event, library: CharacterLibrary) => saveLibrary(library))
  ipcMain.on('charberry:library-save-sync', (event, library: CharacterLibrary) => {
    try {
      event.returnValue = saveLibrary(library)
    } catch {
      event.returnValue = false
    }
  })
  ipcMain.handle('charberry:library-export', async (event, library: CharacterLibrary) => {
    const options = {
      title: 'Export CharBerry library',
      defaultPath: 'charberry-library.json',
      filters: [{ name: 'CharBerry Library', extensions: ['json'] }],
    }
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { canceled: true, success: false }
    writeFileSync(result.filePath, JSON.stringify(normalizeLibrary(library), null, 2), 'utf8')
    return { success: true, filePath: result.filePath }
  })
  ipcMain.handle('charberry:library-import', async (event) => {
    const options = {
      title: 'Import CharBerry library',
      properties: ['openFile'],
      filters: [{ name: 'Character Libraries', extensions: ['json'] }],
    } as OpenDialogOptions
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    try {
      return normalizeLibrary(JSON.parse(readFileSync(result.filePaths[0], 'utf8')))
    } catch {
      return null
    }
  })
  ipcMain.handle('charberry:character-data-export', async (event, defaultPath: string, data: unknown) => {
    const options = {
      title: 'Export character data',
      defaultPath: defaultPath || 'charberry-character.json',
      filters: [{ name: 'Character Data', extensions: ['json'] }],
    }
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { canceled: true, success: false }
    writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8')
    return { success: true, filePath: result.filePath }
  })
  ipcMain.handle('charberry:character-data-import', async (event) => {
    const options = {
      title: 'Import character data',
      properties: ['openFile'],
      filters: [{ name: 'Character JSON', extensions: ['json'] }],
    } as OpenDialogOptions
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    try {
      return JSON.parse(readFileSync(result.filePaths[0], 'utf8')) as unknown
    } catch {
      return null
    }
  })
  ipcMain.handle('charberry:portrait-import', async (event) => {
    const options = {
      title: 'Import character portrait',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    } as OpenDialogOptions
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    try {
      const filePath = result.filePaths[0]
      const data = readFileSync(filePath)
      return `data:${imageMime(filePath)};base64,${data.toString('base64')}`
    } catch {
      return null
    }
  })
  ipcMain.handle('charberry:reveal-data', async () => shell.openPath(userDataPath()))
  ipcMain.handle('charberry:open-external', async (_event, url: string) => {
    const safeUrl = safeExternalUrl(url)
    if (!safeUrl) return false
    await shell.openExternal(safeUrl)
    return true
  })
  ipcMain.handle('charberry:confirm', async (event, message: string, detail?: string) => {
    const options = {
      type: 'question',
      buttons: ['Cancel', 'Delete'],
      cancelId: 0,
      defaultId: 1,
      title: APP_NAME,
      message,
      detail,
    } as MessageBoxOptions
    const owner = ownerWindow(event)
    const result = owner ? await dialog.showMessageBox(owner, options) : await dialog.showMessageBox(options)
    return result.response === 1
  })
}

function contentSecurityPolicy(): string {
  const dev = "default-src 'self' http://localhost:5175 ws://localhost:5175; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5175; style-src 'self' 'unsafe-inline' http://localhost:5175; img-src 'self' data: http://localhost:5175; font-src 'self' data:; connect-src 'self' ws://localhost:5175 http://localhost:5175; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
  const prod = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
  return isDev ? dev : prod
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 720,
    title: APP_NAME,
    backgroundColor: '#101820',
    webPreferences: {
      preload: join(appRoot(), 'dist/preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      nodeIntegrationInWorker: false,
      webviewTag: false,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault())
  if (isDev) void mainWindow.loadURL(RENDERER_URL)
  else void mainWindow.loadFile(join(appRoot(), 'dist/renderer/index.html'))
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [contentSecurityPolicy()] } })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  registerIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
