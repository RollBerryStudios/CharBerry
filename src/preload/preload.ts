import { contextBridge, ipcRenderer } from 'electron'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type SkillRank = 'none' | 'proficient' | 'expertise'

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
  attacks: CharacterAttack[]
  spells: CharacterSpell[]
  inventory: string
  features: string
  personality: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  notes: string
  updatedAt: string
}

export interface CharacterLibrary {
  version: 1
  activeCharacterId: string | null
  characters: CharacterSheet[]
}

export interface CharBerryAPI {
  loadLibrary: () => Promise<CharacterLibrary>
  saveLibrary: (library: CharacterLibrary) => Promise<boolean>
  exportLibrary: (library: CharacterLibrary) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>
  importLibrary: () => Promise<CharacterLibrary | null>
  revealData: () => Promise<string>
  confirm: (message: string, detail?: string) => Promise<boolean>
}

const api: CharBerryAPI = {
  loadLibrary: () => ipcRenderer.invoke('charberry:library-load'),
  saveLibrary: (library) => ipcRenderer.invoke('charberry:library-save', library),
  exportLibrary: (library) => ipcRenderer.invoke('charberry:library-export', library),
  importLibrary: () => ipcRenderer.invoke('charberry:library-import'),
  revealData: () => ipcRenderer.invoke('charberry:reveal-data'),
  confirm: (message, detail) => ipcRenderer.invoke('charberry:confirm', message, detail),
}

contextBridge.exposeInMainWorld('charberry', api)
