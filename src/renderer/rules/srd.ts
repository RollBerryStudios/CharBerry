import type { AbilityKey, SkillRank } from '../../preload/preload'

export interface SrdClass {
  name: string
  hitDie: string
  primary: AbilityKey[]
  savingThrows: AbilityKey[]
  suggestedSkills: string[]
  spellcastingAbility: AbilityKey
  features: string[]
}

export interface SrdSpecies {
  name: string
  speed: number
  features: string[]
}

export interface SrdBackground {
  name: string
  skills: string[]
  features: string[]
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export const SRD_CLASSES: SrdClass[] = [
  { name: 'Barbarian', hitDie: '1d12', primary: ['str', 'con'], savingThrows: ['str', 'con'], suggestedSkills: ['athletics', 'perception'], spellcastingAbility: 'cha', features: ['Rage', 'Unarmored Defense'] },
  { name: 'Bard', hitDie: '1d8', primary: ['cha', 'dex'], savingThrows: ['dex', 'cha'], suggestedSkills: ['performance', 'persuasion', 'insight'], spellcastingAbility: 'cha', features: ['Bardic Inspiration', 'Spellcasting'] },
  { name: 'Cleric', hitDie: '1d8', primary: ['wis', 'con'], savingThrows: ['wis', 'cha'], suggestedSkills: ['insight', 'medicine'], spellcastingAbility: 'wis', features: ['Spellcasting', 'Divine Domain'] },
  { name: 'Druid', hitDie: '1d8', primary: ['wis', 'con'], savingThrows: ['int', 'wis'], suggestedSkills: ['nature', 'survival'], spellcastingAbility: 'wis', features: ['Druidic', 'Spellcasting'] },
  { name: 'Fighter', hitDie: '1d10', primary: ['str', 'con'], savingThrows: ['str', 'con'], suggestedSkills: ['athletics', 'perception'], spellcastingAbility: 'int', features: ['Fighting Style', 'Second Wind'] },
  { name: 'Monk', hitDie: '1d8', primary: ['dex', 'wis'], savingThrows: ['str', 'dex'], suggestedSkills: ['acrobatics', 'stealth'], spellcastingAbility: 'wis', features: ['Unarmored Defense', 'Martial Arts'] },
  { name: 'Paladin', hitDie: '1d10', primary: ['str', 'cha'], savingThrows: ['wis', 'cha'], suggestedSkills: ['athletics', 'persuasion'], spellcastingAbility: 'cha', features: ['Divine Sense', 'Lay on Hands'] },
  { name: 'Ranger', hitDie: '1d10', primary: ['dex', 'wis'], savingThrows: ['str', 'dex'], suggestedSkills: ['perception', 'survival'], spellcastingAbility: 'wis', features: ['Favored Enemy', 'Natural Explorer'] },
  { name: 'Rogue', hitDie: '1d8', primary: ['dex', 'int'], savingThrows: ['dex', 'int'], suggestedSkills: ['stealth', 'sleightOfHand', 'investigation', 'perception'], spellcastingAbility: 'int', features: ['Expertise', 'Sneak Attack', 'Thieves Cant'] },
  { name: 'Sorcerer', hitDie: '1d6', primary: ['cha', 'con'], savingThrows: ['con', 'cha'], suggestedSkills: ['arcana', 'persuasion'], spellcastingAbility: 'cha', features: ['Spellcasting', 'Sorcerous Origin'] },
  { name: 'Warlock', hitDie: '1d8', primary: ['cha', 'con'], savingThrows: ['wis', 'cha'], suggestedSkills: ['arcana', 'intimidation'], spellcastingAbility: 'cha', features: ['Otherworldly Patron', 'Pact Magic'] },
  { name: 'Wizard', hitDie: '1d6', primary: ['int', 'con'], savingThrows: ['int', 'wis'], suggestedSkills: ['arcana', 'history'], spellcastingAbility: 'int', features: ['Spellcasting', 'Arcane Recovery'] },
]

export const SRD_SPECIES: SrdSpecies[] = [
  { name: 'Human', speed: 30, features: ['Ability Score Increase', 'Languages'] },
  { name: 'Dwarf', speed: 25, features: ['Darkvision', 'Dwarven Resilience'] },
  { name: 'Elf', speed: 30, features: ['Darkvision', 'Keen Senses', 'Fey Ancestry'] },
  { name: 'Halfling', speed: 25, features: ['Lucky', 'Brave'] },
  { name: 'Dragonborn', speed: 30, features: ['Draconic Ancestry', 'Breath Weapon'] },
  { name: 'Gnome', speed: 25, features: ['Darkvision', 'Gnome Cunning'] },
  { name: 'Half-Elf', speed: 30, features: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'] },
  { name: 'Half-Orc', speed: 30, features: ['Darkvision', 'Relentless Endurance'] },
  { name: 'Tiefling', speed: 30, features: ['Darkvision', 'Hellish Resistance'] },
]

export const SRD_BACKGROUNDS: SrdBackground[] = [
  { name: 'Acolyte', skills: ['insight', 'religion'], features: ['Shelter of the Faithful'] },
  { name: 'Charlatan', skills: ['deception', 'sleightOfHand'], features: ['False Identity'] },
  { name: 'Criminal', skills: ['deception', 'stealth'], features: ['Criminal Contact'] },
  { name: 'Entertainer', skills: ['acrobatics', 'performance'], features: ['By Popular Demand'] },
  { name: 'Folk Hero', skills: ['animalHandling', 'survival'], features: ['Rustic Hospitality'] },
  { name: 'Guild Artisan', skills: ['insight', 'persuasion'], features: ['Guild Membership'] },
  { name: 'Hermit', skills: ['medicine', 'religion'], features: ['Discovery'] },
  { name: 'Noble', skills: ['history', 'persuasion'], features: ['Position of Privilege'] },
  { name: 'Outlander', skills: ['athletics', 'survival'], features: ['Wanderer'] },
  { name: 'Sage', skills: ['arcana', 'history'], features: ['Researcher'] },
  { name: 'Sailor', skills: ['athletics', 'perception'], features: ['Ships Passage'] },
  { name: 'Soldier', skills: ['athletics', 'intimidation'], features: ['Military Rank'] },
  { name: 'Urchin', skills: ['sleightOfHand', 'stealth'], features: ['City Secrets'] },
]

export function applySkillPicks(base: Record<string, SkillRank>, keys: string[]): Record<string, SkillRank> {
  const next = { ...base }
  for (const key of keys) next[key] = next[key] === 'expertise' ? 'expertise' : 'proficient'
  return next
}

export function classByName(name: string): SrdClass {
  return SRD_CLASSES.find((item) => item.name === name) ?? SRD_CLASSES[4]
}

export function speciesByName(name: string): SrdSpecies {
  return SRD_SPECIES.find((item) => item.name === name) ?? SRD_SPECIES[0]
}

export function backgroundByName(name: string): SrdBackground {
  return SRD_BACKGROUNDS.find((item) => item.name === name) ?? SRD_BACKGROUNDS[0]
}
