import { contextBridge, ipcRenderer } from 'electron'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type SkillRank = 'none' | 'proficient' | 'expertise'
export type Locale = 'en' | 'de'

export interface CharacterAttack {
  id: string
  name: string
  bonus: string
  damage: string
  damageType: string
  range: string
  notes: string
}

export interface CharacterSpell {
  id: string
  level: number
  name: string
  prepared: boolean
  notes: string
}

export interface CharacterInventoryItem {
  id: string
  name: string
  quantity: number
  weight: number
  value: string
  equipped: boolean
  notes: string
}

export interface CharacterSessionNote {
  id: string
  date: string
  title: string
  body: string
  tags: string[]
}

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

export interface CharacterLibrary {
  version: 1
  activeCharacterId: string | null
  characters: CharacterSheet[]
  settings?: { locale: Locale }
}

export interface CharBerryAPI {
  loadLibrary: () => Promise<CharacterLibrary>
  saveLibrary: (library: CharacterLibrary) => Promise<boolean>
  saveLibrarySync: (library: CharacterLibrary) => boolean
  exportLibrary: (library: CharacterLibrary) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>
  importLibrary: () => Promise<CharacterLibrary | null>
  exportCharacterData: (defaultPath: string, data: unknown) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>
  importCharacterData: () => Promise<unknown | null>
  importPortrait: () => Promise<string | null>
  revealData: () => Promise<string>
  confirm: (message: string, detail?: string) => Promise<boolean>
}

const api: CharBerryAPI = {
  loadLibrary: () => ipcRenderer.invoke('charberry:library-load'),
  saveLibrary: (library) => ipcRenderer.invoke('charberry:library-save', library),
  saveLibrarySync: (library) => Boolean(ipcRenderer.sendSync('charberry:library-save-sync', library)),
  exportLibrary: (library) => ipcRenderer.invoke('charberry:library-export', library),
  importLibrary: () => ipcRenderer.invoke('charberry:library-import'),
  exportCharacterData: (defaultPath, data) => ipcRenderer.invoke('charberry:character-data-export', defaultPath, data),
  importCharacterData: () => ipcRenderer.invoke('charberry:character-data-import'),
  importPortrait: () => ipcRenderer.invoke('charberry:portrait-import'),
  revealData: () => ipcRenderer.invoke('charberry:reveal-data'),
  confirm: (message, detail) => ipcRenderer.invoke('charberry:confirm', message, detail),
}

contextBridge.exposeInMainWorld('charberry', api)
