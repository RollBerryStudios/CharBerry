import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { AbilityKey, CharacterAttack, CharacterInventoryItem, CharacterLibrary, CharacterSessionNote, CharacterSheet, CharacterSpell, Locale, SkillRank, Theme } from '../preload/preload'
import logoUrl from '../../resources/logo.png'
import { backgroundLabel, classLabel, skillLabel, speciesLabel, t, type TranslationKey } from './i18n'
import { applySkillPicks, backgroundByName, classByName, speciesByName, SRD_BACKGROUNDS, SRD_CLASSES, SRD_SPECIES, STANDARD_ARRAY } from './rules/srd'

type TabId = 'overview' | 'combat' | 'skills' | 'story' | 'notes'

const ABILITIES: Array<{ key: AbilityKey; label: string }> = [
  { key: 'str', label: 'STR' },
  { key: 'dex', label: 'DEX' },
  { key: 'con', label: 'CON' },
  { key: 'int', label: 'INT' },
  { key: 'wis', label: 'WIS' },
  { key: 'cha', label: 'CHA' },
]

const SKILLS: Array<{ key: string; label: string; ability: AbilityKey }> = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
]

const TABS: Array<{ id: TabId; label: TranslationKey }> = [
  { id: 'overview', label: 'overview' },
  { id: 'combat', label: 'combat' },
  { id: 'skills', label: 'skills' },
  { id: 'story', label: 'story' },
  { id: 'notes', label: 'notes' },
]

const GITHUB_URL = 'https://github.com/RollBerryStudios/CharBerry'
const ROLLBERRY_URL = 'https://github.com/RollBerryStudios'
const CONTACT_EMAIL = 'kontakt@rollberry.de'
const CONTACT_URL = `mailto:${CONTACT_EMAIL}`

interface CreatorDraft {
  name: string
  ancestry: string
  className: string
  background: string
  level: number
  abilityMethod: 'standard' | 'manual'
}

interface ContextMenuState {
  x: number
  y: number
  kind: 'character' | 'inventory' | 'note'
  id: string
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function modifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function formatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

function proficiency(level: number): number {
  return Math.ceil(Math.max(1, Math.min(20, level)) / 4) + 1
}

function skillBonus(character: CharacterSheet, skillKey: string): number {
  const skill = SKILLS.find((item) => item.key === skillKey)
  if (!skill) return 0
  const rank = character.skills[skillKey] ?? 'none'
  const prof = proficiency(character.level)
  const multiplier = rank === 'expertise' ? 2 : rank === 'proficient' ? 1 : 0
  return modifier(character.abilityScores[skill.ability]) + prof * multiplier
}

function saveBonus(character: CharacterSheet, ability: AbilityKey): number {
  return modifier(character.abilityScores[ability]) + (character.savingThrows[ability] ? proficiency(character.level) : 0)
}

function spellDc(character: CharacterSheet): number {
  return 8 + proficiency(character.level) + modifier(character.abilityScores[character.spellcastingAbility])
}

function spellAttack(character: CharacterSheet): number {
  return proficiency(character.level) + modifier(character.abilityScores[character.spellcastingAbility])
}

function emptySkills(): Record<string, SkillRank> {
  return Object.fromEntries(SKILLS.map((skill) => [skill.key, 'none'])) as Record<string, SkillRank>
}

function emptyCharacter(): CharacterSheet {
  return {
    id: newId(),
    name: 'New Hero',
    ancestry: '',
    className: '',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    xp: 0,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    skills: emptySkills(),
    hpMax: 8,
    hpCurrent: 8,
    hpTemp: 0,
    armorClass: 10,
    speed: 30,
    initiativeBonus: 0,
    spellcastingAbility: 'cha',
    hitDice: '1d8',
    inspiration: false,
    portraitDataUrl: '',
    attacks: [],
    spells: [],
    inventory: '',
    inventoryItems: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    features: '',
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    notes: '',
    sessionNotes: [],
    updatedAt: new Date().toISOString(),
  }
}

function emptyLibrary(): CharacterLibrary {
  const character = emptyCharacter()
  return { version: 1, activeCharacterId: character.id, characters: [character], settings: { locale: 'de', theme: 'dark' } }
}

function numberValue(value: string, fallback = 0): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function moneyValue(value: string): number {
  return Math.max(0, Math.min(999999, Math.trunc(numberValue(value, 0))))
}

function inventorySummary(items: CharacterInventoryItem[]): string {
  return items.map((item) => `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.name}`).join(', ')
}

function totalWeight(items: CharacterInventoryItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.weight * item.quantity, 0) * 100) / 100
}

function totalValueText(items: CharacterInventoryItem[]): string {
  const values = items.map((item) => item.value.trim()).filter(Boolean)
  return values.length ? values.join(' + ') : '-'
}

function parseTags(value: string): string[] {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))).slice(0, 12)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function newInventoryItem(locale: Locale = 'en'): CharacterInventoryItem {
  return { id: newId(), name: t(locale, 'newItem'), quantity: 1, weight: 0, value: '', equipped: false, notes: '' }
}

function newSessionNote(locale: Locale = 'en'): CharacterSessionNote {
  return { id: newId(), date: today(), title: t(locale, 'sessionNote'), body: '', tags: [] }
}

function suggestedStandardScores(primary: AbilityKey[]): Record<AbilityKey, number> {
  const order: AbilityKey[] = [...primary, 'con', 'dex', 'wis', 'int', 'str', 'cha']
  const unique = Array.from(new Set(order)) as AbilityKey[]
  const scores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  unique.slice(0, 6).forEach((ability, index) => { scores[ability] = STANDARD_ARRAY[index] ?? 10 })
  return scores
}

function characterFromExternal(data: unknown): CharacterSheet | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const source = (root.character && typeof root.character === 'object' ? root.character : root) as Record<string, unknown>
  const name = typeof source.name === 'string' ? source.name : typeof root.name === 'string' ? root.name : ''
  if (!name.trim()) return null
  const classes = Array.isArray(source.classes) ? source.classes as Array<Record<string, unknown>> : []
  const firstClass = classes[0] ?? {}
  const race = source.race && typeof source.race === 'object' ? source.race as Record<string, unknown> : {}
  const stats = Array.isArray(source.stats) ? source.stats as Array<Record<string, unknown>> : []
  const abilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  const statMap: Record<number, AbilityKey> = { 1: 'str', 2: 'dex', 3: 'con', 4: 'int', 5: 'wis', 6: 'cha' }
  for (const stat of stats) {
    const key = statMap[Number(stat.id)]
    const value = Number(stat.value ?? stat.overrideValue)
    if (key && Number.isFinite(value)) abilityScores[key] = Math.max(1, Math.min(30, value))
  }
  const character = emptyCharacter()
  character.name = name.trim()
  character.ancestry = String(race.fullName ?? race.baseRaceName ?? source.ancestry ?? source.race ?? '')
  character.className = String(firstClass.definition && typeof firstClass.definition === 'object'
    ? (firstClass.definition as Record<string, unknown>).name ?? ''
    : source.className ?? '')
  character.subclass = String(firstClass.subclassDefinition && typeof firstClass.subclassDefinition === 'object'
    ? (firstClass.subclassDefinition as Record<string, unknown>).name ?? ''
    : source.subclass ?? '')
  character.level = Math.max(1, Math.min(20, Number(firstClass.level ?? source.level ?? 1)))
  character.background = String(source.background && typeof source.background === 'object'
    ? (source.background as Record<string, unknown>).name ?? ''
    : source.background ?? '')
  character.abilityScores = abilityScores
  character.inventoryItems = Array.isArray(source.inventory)
    ? (source.inventory as Array<Record<string, unknown>>).map((item) => ({
      id: newId(),
      name: String(item.name ?? (item.definition && typeof item.definition === 'object' ? (item.definition as Record<string, unknown>).name ?? 'Item' : 'Item')),
      quantity: Math.max(1, Math.min(9999, Number(item.quantity ?? 1))),
      weight: Math.max(0, Math.min(9999, Number(item.weight ?? 0))),
      value: String(item.value ?? ''),
      equipped: Boolean(item.equipped),
      notes: '',
    }))
    : []
  character.inventory = inventorySummary(character.inventoryItems)
  character.notes = typeof source.notes === 'string' ? source.notes : ''
  character.sessionNotes = character.notes ? [{ id: newId(), date: today(), title: 'Imported notes', body: character.notes, tags: ['ddb'] }] : []
  character.updatedAt = new Date().toISOString()
  return character
}

export default function App() {
  const [library, setLibrary] = useState<CharacterLibrary>(emptyLibrary)
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabId>('overview')
  const [toast, setToast] = useState<string | null>(null)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const libraryRef = useRef(library)

  const activeCharacter = library.characters.find((character) => character.id === library.activeCharacterId) ?? library.characters[0]
  const locale: Locale = library.settings?.locale ?? 'de'
  const theme: Theme = library.settings?.theme ?? 'dark'

  useEffect(() => {
    void window.charberry.loadLibrary().then((loaded) => {
      setLibrary(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    libraryRef.current = library
  }, [library])

  function flushLibrarySave(): void {
    if (!ready) return
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    window.charberry.saveLibrarySync(libraryRef.current)
  }

  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      void window.charberry.saveLibrary(library)
    }, 250)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [library, ready])

  useEffect(() => {
    if (!ready) return
    const flush = () => flushLibrarySave()
    const flushWhenHidden = () => { if (document.visibilityState === 'hidden') flushLibrarySave() }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flushWhenHidden)
    return () => {
      flushLibrarySave()
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [ready])

  const filteredCharacters = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return library.characters
    return library.characters.filter((character) => `${character.name} ${character.ancestry} ${character.className} ${character.background}`.toLowerCase().includes(q))
  }, [library.characters, search])

  function notify(message: string): void {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  function updateActive(patch: Partial<CharacterSheet>): void {
    if (!activeCharacter) return
    setLibrary((current) => ({
      ...current,
      characters: current.characters.map((character) => character.id === activeCharacter.id
        ? { ...character, ...patch, updatedAt: new Date().toISOString() }
        : character),
    }))
  }

  function setLocale(locale: Locale): void {
    setLibrary((current) => ({ ...current, settings: { locale, theme: current.settings?.theme ?? theme } }))
  }

  function setTheme(theme: Theme): void {
    setLibrary((current) => ({ ...current, settings: { locale: current.settings?.locale ?? locale, theme } }))
  }

  function updateAbility(key: AbilityKey, value: number): void {
    updateActive({ abilityScores: { ...activeCharacter.abilityScores, [key]: Math.max(1, Math.min(30, value)) } })
  }

  function updateSkill(key: string, rank: SkillRank): void {
    updateActive({ skills: { ...activeCharacter.skills, [key]: rank } })
  }

  function addCharacter(): void {
    const character = emptyCharacter()
    setLibrary((current) => ({ ...current, activeCharacterId: character.id, characters: [character, ...current.characters] }))
    setTab('overview')
  }

  function duplicateCharacter(id = activeCharacter?.id): void {
    const source = library.characters.find((character) => character.id === id)
    if (!source) return
    const copy: CharacterSheet = {
      ...source,
      id: newId(),
      name: `${source.name} ${t(locale, 'copySuffix')}`,
      attacks: source.attacks.map((attack) => ({ ...attack, id: newId() })),
      spells: source.spells.map((spell) => ({ ...spell, id: newId() })),
      inventoryItems: source.inventoryItems.map((item) => ({ ...item, id: newId() })),
      sessionNotes: source.sessionNotes.map((note) => ({ ...note, id: newId() })),
      updatedAt: new Date().toISOString(),
    }
    setLibrary((current) => ({ ...current, activeCharacterId: copy.id, characters: [copy, ...current.characters] }))
  }

  async function deleteCharacter(): Promise<void> {
    if (!activeCharacter || library.characters.length <= 1) return
    const ok = await window.charberry.confirm(`${t(locale, 'delete')} ${activeCharacter.name}?`, t(locale, 'deleteCharacterDetail'))
    if (!ok) return
    setLibrary((current) => {
      const characters = current.characters.filter((character) => character.id !== activeCharacter.id)
      return { ...current, characters, activeCharacterId: characters[0]?.id ?? null }
    })
  }

  async function importLibrary(): Promise<void> {
    try {
      const imported = await window.charberry.importLibrary()
      if (!imported) {
        notify(t(locale, 'importInvalid'))
        return
      }
      setLibrary(imported)
      notify(t(locale, 'libraryImported'))
    } catch {
      notify(t(locale, 'importFailed'))
    }
  }

  async function importPortrait(): Promise<void> {
    const dataUrl = await window.charberry.importPortrait()
    if (!dataUrl) {
      notify(t(locale, 'portraitFailed'))
      return
    }
    updateActive({ portraitDataUrl: dataUrl })
    notify(t(locale, 'portraitImported'))
  }

  async function importDdbLikeCharacter(): Promise<void> {
    const data = await window.charberry.importCharacterData()
    const character = data ? characterFromExternal(data) : null
    if (!character) {
      notify(t(locale, 'ddbUnsupported'))
      return
    }
    setLibrary((current) => ({ ...current, activeCharacterId: character.id, characters: [character, ...current.characters] }))
    notify(t(locale, 'ddbImported'))
  }

  async function exportActiveCharacter(): Promise<void> {
    if (!activeCharacter) return
    await window.charberry.exportCharacterData(`${activeCharacter.name || 'character'}.charberry.json`, { version: 1, character: activeCharacter })
  }

  async function exportDdbBridge(): Promise<void> {
    if (!activeCharacter) return
    await window.charberry.exportCharacterData(`${activeCharacter.name || 'character'}.ddb-bridge.json`, {
      format: 'charberry-ddb-bridge',
      exportedAt: new Date().toISOString(),
      character: activeCharacter,
    })
  }

  function upsertAttack(id: string, patch: Partial<CharacterAttack>): void {
    updateActive({ attacks: activeCharacter.attacks.map((attack) => attack.id === id ? { ...attack, ...patch } : attack) })
  }

  function upsertSpell(id: string, patch: Partial<CharacterSpell>): void {
    updateActive({ spells: activeCharacter.spells.map((spell) => spell.id === id ? { ...spell, ...patch } : spell) })
  }

  function updateInventoryItems(items: CharacterInventoryItem[]): void {
    updateActive({ inventoryItems: items, inventory: inventorySummary(items) })
  }

  function upsertInventoryItem(id: string, patch: Partial<CharacterInventoryItem>): void {
    updateInventoryItems(activeCharacter.inventoryItems.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function updateSessionNotes(sessionNotes: CharacterSessionNote[]): void {
    updateActive({ sessionNotes, notes: sessionNotes.map((note) => `${note.date} ${note.title}: ${note.body}`).join('\n\n') })
  }

  function upsertSessionNote(id: string, patch: Partial<CharacterSessionNote>): void {
    updateSessionNotes(activeCharacter.sessionNotes.map((note) => note.id === id ? { ...note, ...patch } : note))
  }

  function applyCreatorTemplate(draft: CreatorDraft): void {
    const srdClass = classByName(draft.className)
    const species = speciesByName(draft.ancestry)
    const background = backgroundByName(draft.background)
    const abilityScores = draft.abilityMethod === 'standard'
      ? suggestedStandardScores(srdClass.primary)
      : activeCharacter.abilityScores
    const savingThrows = { str: false, dex: false, con: false, int: false, wis: false, cha: false } as Record<AbilityKey, boolean>
    for (const ability of srdClass.savingThrows) savingThrows[ability] = true
    const skills = applySkillPicks(applySkillPicks(emptySkills(), srdClass.suggestedSkills), background.skills)
    updateActive({
      name: draft.name.trim() || activeCharacter.name,
      ancestry: species.name,
      className: srdClass.name,
      background: background.name,
      level: draft.level,
      abilityScores,
      savingThrows,
      skills,
      spellcastingAbility: srdClass.spellcastingAbility,
      hitDice: draft.level === 1 ? srdClass.hitDie : `${draft.level}${srdClass.hitDie.slice(1)}`,
      hpMax: Math.max(1, Number(srdClass.hitDie.replace('1d', '')) + modifier(abilityScores.con)),
      hpCurrent: Math.max(1, Number(srdClass.hitDie.replace('1d', '')) + modifier(abilityScores.con)),
      speed: species.speed,
      features: [...srdClass.features, ...species.features, ...background.features].join(', '),
    })
    setCreatorOpen(false)
    setTab('overview')
  }

  if (!ready || !activeCharacter) return <div className="loading">Loading CharBerry...</div>

  const passivePerception = 10 + skillBonus(activeCharacter, 'perception')
  const passiveInsight = 10 + skillBonus(activeCharacter, 'insight')
  const initiative = modifier(activeCharacter.abilityScores.dex) + activeCharacter.initiativeBonus

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="titlebar">
        <div className="brand">
          <img src={logoUrl} alt="" />
          <div>
            <strong>CharBerry</strong>
            <span>{t(locale, 'tagline')}</span>
          </div>
        </div>
        <div className="titlebar-actions">
          <button onClick={() => setSettingsOpen(true)}>{t(locale, 'settings')}</button>
          <button onClick={() => setCreatorOpen(true)}>{t(locale, 'wizard')}</button>
          <details className="action-menu">
            <summary>{t(locale, 'dataActions')}</summary>
            <div>
              <button onClick={importDdbLikeCharacter}>{t(locale, 'importDdb')}</button>
              <button onClick={exportDdbBridge}>{t(locale, 'exportDdb')}</button>
              <button onClick={() => window.charberry.exportLibrary(library)}>{t(locale, 'export')}</button>
              <button onClick={importLibrary}>{t(locale, 'import')}</button>
              <button onClick={() => window.charberry.revealData()}>{t(locale, 'dataFolder')}</button>
            </div>
          </details>
        </div>
      </header>

      <main className="char-layout">
        <aside className="roster-panel">
          <div className="panel-head">
            <div>
              <h2>{t(locale, 'characters')}</h2>
              <p>{library.characters.length} {t(locale, 'savedSheets')}</p>
            </div>
            <button className="primary" onClick={addCharacter}>{t(locale, 'new')}</button>
          </div>
          <input aria-label="Search characters" className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t(locale, 'searchCharacters')} />
          <div className="roster-list">
            {filteredCharacters.map((character) => (
              <button
                key={character.id}
                className={`roster-card ${character.id === activeCharacter.id ? 'active' : ''}`}
                onClick={() => setLibrary((current) => ({ ...current, activeCharacterId: character.id }))}
                onContextMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, kind: 'character', id: character.id }) }}
              >
                <span className="avatar">{character.portraitDataUrl ? <img src={character.portraitDataUrl} alt="" /> : character.name.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{character.name}</strong>
                  <em>{t(locale, 'level')} {character.level} {speciesLabel(locale, character.ancestry)} {classLabel(locale, character.className)}</em>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="sheet-panel">
          <div className="hero-sheet">
            <button className="portrait" onClick={importPortrait} title={t(locale, 'setPortrait')} aria-label={t(locale, 'setPortrait')}>
              {activeCharacter.portraitDataUrl ? <img src={activeCharacter.portraitDataUrl} alt="" /> : activeCharacter.name.slice(0, 1).toUpperCase()}
            </button>
            <div className="identity-grid">
              <label>{t(locale, 'name')}<input aria-label="Name" value={activeCharacter.name} onChange={(event) => updateActive({ name: event.target.value })} /></label>
              <label>{t(locale, 'ancestry')}<input aria-label="Ancestry" value={activeCharacter.ancestry} onChange={(event) => updateActive({ ancestry: event.target.value })} /></label>
              <label>{t(locale, 'class')}<input aria-label="Class" value={activeCharacter.className} onChange={(event) => updateActive({ className: event.target.value })} /></label>
              <label>{t(locale, 'subclass')}<input aria-label="Subclass" value={activeCharacter.subclass} onChange={(event) => updateActive({ subclass: event.target.value })} /></label>
              <label>{t(locale, 'level')}<input aria-label="Level" type="number" min={1} max={20} value={activeCharacter.level} onChange={(event) => updateActive({ level: numberValue(event.target.value, 1) })} /></label>
              <label>{t(locale, 'background')}<input aria-label="Background" value={activeCharacter.background} onChange={(event) => updateActive({ background: event.target.value })} /></label>
            </div>
            <button className="danger delete-character" disabled={library.characters.length <= 1} onClick={deleteCharacter}>{t(locale, 'delete')}</button>
          </div>

          <div className="derived-strip">
            <Stat label={t(locale, 'proficiency')} value={formatBonus(proficiency(activeCharacter.level))} />
            <Stat label={t(locale, 'initiative')} value={formatBonus(initiative)} />
            <Stat label={t(locale, 'passivePerception')} value={String(passivePerception)} />
            <Stat label={t(locale, 'passiveInsight')} value={String(passiveInsight)} />
            <Stat label={t(locale, 'spellDc')} value={String(spellDc(activeCharacter))} />
            <Stat label={t(locale, 'spellAttack')} value={formatBonus(spellAttack(activeCharacter))} />
          </div>

          <nav className="tabs" aria-label="Character sections">
            {TABS.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{t(locale, item.label)}</button>)}
          </nav>

          <div className="tab-content">
            {tab === 'overview' && (
              <div className="content-grid overview-grid">
                <section className="card ability-card">
                  <h2>{t(locale, 'abilityScores')}</h2>
                  <div className="ability-grid">
                    {ABILITIES.map((ability) => (
                      <label key={ability.key} className="ability-box">
                        <span>{ability.label}</span>
                        <input type="number" min={1} max={30} value={activeCharacter.abilityScores[ability.key]} onChange={(event) => updateAbility(ability.key, numberValue(event.target.value, 10))} />
                        <strong>{formatBonus(modifier(activeCharacter.abilityScores[ability.key]))}</strong>
                      </label>
                    ))}
                  </div>
                </section>
                <section className="card quick-card">
                  <h2>{t(locale, 'vitals')}</h2>
                  <div className="form-grid three">
                    <label>{t(locale, 'armorClass')}<input aria-label="Armor Class" type="number" value={activeCharacter.armorClass} onChange={(event) => updateActive({ armorClass: numberValue(event.target.value, 10) })} /></label>
                    <label>{t(locale, 'speed')}<input aria-label="Speed" type="number" value={activeCharacter.speed} onChange={(event) => updateActive({ speed: numberValue(event.target.value, 30) })} /></label>
                    <label>{t(locale, 'hitDice')}<input aria-label="Hit Dice" value={activeCharacter.hitDice} onChange={(event) => updateActive({ hitDice: event.target.value })} /></label>
                    <label>{t(locale, 'currentHp')}<input aria-label="Current HP" type="number" value={activeCharacter.hpCurrent} onChange={(event) => updateActive({ hpCurrent: numberValue(event.target.value) })} /></label>
                    <label>{t(locale, 'maxHp')}<input aria-label="Max HP" type="number" value={activeCharacter.hpMax} onChange={(event) => updateActive({ hpMax: numberValue(event.target.value) })} /></label>
                    <label>{t(locale, 'tempHp')}<input aria-label="Temp HP" type="number" value={activeCharacter.hpTemp} onChange={(event) => updateActive({ hpTemp: numberValue(event.target.value) })} /></label>
                    <label>{t(locale, 'alignment')}<input aria-label="Alignment" value={activeCharacter.alignment} onChange={(event) => updateActive({ alignment: event.target.value })} /></label>
                    <label>{t(locale, 'xp')}<input aria-label="XP" type="number" value={activeCharacter.xp} onChange={(event) => updateActive({ xp: numberValue(event.target.value) })} /></label>
                    <label className="check-line"><input type="checkbox" checked={activeCharacter.inspiration} onChange={(event) => updateActive({ inspiration: event.target.checked })} /> {t(locale, 'inspiration')}</label>
                  </div>
                </section>
              </div>
            )}

            {tab === 'combat' && (
              <div className="content-grid combat-grid">
                <section className="card">
                  <div className="section-line">
                    <h2>{t(locale, 'attacks')}</h2>
                  <button onClick={() => updateActive({ attacks: [...activeCharacter.attacks, { id: newId(), name: t(locale, 'newAttack'), bonus: '', damage: '', damageType: '', range: '', notes: '' }] })}>{t(locale, 'addAttack')}</button>
                  </div>
                  <div className="rows">
                    {activeCharacter.attacks.map((attack) => (
                      <div className="attack-row" key={attack.id}>
                        <input aria-label="Attack name" value={attack.name} onChange={(event) => upsertAttack(attack.id, { name: event.target.value })} />
                        <input aria-label="Attack bonus" value={attack.bonus} onChange={(event) => upsertAttack(attack.id, { bonus: event.target.value })} />
                        <input aria-label="Attack damage" value={attack.damage} onChange={(event) => upsertAttack(attack.id, { damage: event.target.value })} />
                        <input aria-label="Attack range" value={attack.range} onChange={(event) => upsertAttack(attack.id, { range: event.target.value })} />
                        <button className="icon-button danger" aria-label={`${t(locale, 'remove')} ${attack.name}`} onClick={() => updateActive({ attacks: activeCharacter.attacks.filter((item) => item.id !== attack.id) })}>x</button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card">
                  <div className="section-line">
                    <h2>{t(locale, 'spells')}</h2>
                    <button onClick={() => updateActive({ spells: [...activeCharacter.spells, { id: newId(), level: 1, name: t(locale, 'newSpell'), prepared: true, notes: '' }] })}>{t(locale, 'addSpell')}</button>
                  </div>
                  <label>{t(locale, 'spellcastingAbility')}
                    <select value={activeCharacter.spellcastingAbility} onChange={(event) => updateActive({ spellcastingAbility: event.target.value as AbilityKey })}>
                      {ABILITIES.map((ability) => <option key={ability.key} value={ability.key}>{ability.label}</option>)}
                    </select>
                  </label>
                  <div className="rows">
                    {activeCharacter.spells.map((spell) => (
                      <div className="spell-row" key={spell.id}>
                        <input aria-label="Spell name" value={spell.name} onChange={(event) => upsertSpell(spell.id, { name: event.target.value })} />
                        <input aria-label="Spell level" type="number" min={0} max={9} value={spell.level} onChange={(event) => upsertSpell(spell.id, { level: numberValue(event.target.value) })} />
                        <label className="check-line"><input type="checkbox" checked={spell.prepared} onChange={(event) => upsertSpell(spell.id, { prepared: event.target.checked })} /> {t(locale, 'prepared')}</label>
                        <button className="icon-button danger" aria-label={`${t(locale, 'remove')} ${spell.name}`} onClick={() => updateActive({ spells: activeCharacter.spells.filter((item) => item.id !== spell.id) })}>x</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === 'skills' && (
              <div className="content-grid skills-grid">
                <section className="card">
                  <h2>{t(locale, 'savingThrows')}</h2>
                  <div className="save-grid">
                    {ABILITIES.map((ability) => (
                      <label className="save-row" key={ability.key}>
                        <input type="checkbox" checked={activeCharacter.savingThrows[ability.key]} onChange={(event) => updateActive({ savingThrows: { ...activeCharacter.savingThrows, [ability.key]: event.target.checked } })} />
                        <span>{ability.label}</span>
                        <strong>{formatBonus(saveBonus(activeCharacter, ability.key))}</strong>
                      </label>
                    ))}
                  </div>
                </section>
                <section className="card skill-table-card">
                  <h2>{t(locale, 'skills')}</h2>
                  <div className="skill-table">
                    {SKILLS.map((skill) => (
                      <div className="skill-row" key={skill.key}>
                        <strong>{formatBonus(skillBonus(activeCharacter, skill.key))}</strong>
                        <span>{skillLabel(locale, skill.key)}</span>
                        <em>{skill.ability.toUpperCase()}</em>
                        <select value={activeCharacter.skills[skill.key] ?? 'none'} onChange={(event) => updateSkill(skill.key, event.target.value as SkillRank)}>
                          <option value="none">{t(locale, 'none')}</option>
                          <option value="proficient">{t(locale, 'proficient')}</option>
                          <option value="expertise">{t(locale, 'expertise')}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === 'story' && (
              <div className="content-grid story-grid">
                <TextCard title={t(locale, 'personality')} value={activeCharacter.personality} onChange={(value) => updateActive({ personality: value })} />
                <TextCard title={t(locale, 'ideals')} value={activeCharacter.ideals} onChange={(value) => updateActive({ ideals: value })} />
                <TextCard title={t(locale, 'bonds')} value={activeCharacter.bonds} onChange={(value) => updateActive({ bonds: value })} />
                <TextCard title={t(locale, 'flaws')} value={activeCharacter.flaws} onChange={(value) => updateActive({ flaws: value })} />
                <TextCard title={t(locale, 'backstory')} value={activeCharacter.backstory} onChange={(value) => updateActive({ backstory: value })} large />
                <TextCard title={t(locale, 'features')} value={activeCharacter.features} onChange={(value) => updateActive({ features: value })} large />
              </div>
            )}

            {tab === 'notes' && (
              <div className="content-grid notes-grid">
                <InventoryCard
                  locale={locale}
                  character={activeCharacter}
                  onCurrency={(currency) => updateActive({ currency })}
                  onAdd={() => updateInventoryItems([...activeCharacter.inventoryItems, newInventoryItem(locale)])}
                  onUpdate={upsertInventoryItem}
                  onDelete={(id) => updateInventoryItems(activeCharacter.inventoryItems.filter((item) => item.id !== id))}
                  onContextMenu={(event, id) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, kind: 'inventory', id }) }}
                />
                <SessionNotesCard
                  locale={locale}
                  notes={activeCharacter.sessionNotes}
                  onAdd={() => updateSessionNotes([newSessionNote(locale), ...activeCharacter.sessionNotes])}
                  onUpdate={upsertSessionNote}
                  onDelete={(id) => updateSessionNotes(activeCharacter.sessionNotes.filter((note) => note.id !== id))}
                  onContextMenu={(event, id) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, kind: 'note', id }) }}
                />
              </div>
            )}
          </div>
        </section>
      </main>
      {creatorOpen && (
        <CharacterCreator
          locale={locale}
          activeCharacter={activeCharacter}
          onApply={applyCreatorTemplate}
          onClose={() => setCreatorOpen(false)}
        />
      )}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-label={t(locale, 'settings')} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{t(locale, 'settings')}</h2>
                <p>{t(locale, 'rollberryTitle')}</p>
              </div>
              <button className="icon-button" aria-label={t(locale, 'close')} onClick={() => setSettingsOpen(false)}>x</button>
            </header>
            <div className="settings-grid">
              <section>
                <h3>{t(locale, 'appearance')}</h3>
                <label>{t(locale, 'language')}
                  <select aria-label={t(locale, 'language')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label>{t(locale, 'theme')}
                  <select aria-label={t(locale, 'theme')} value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
                    <option value="dark">{t(locale, 'darkMode')}</option>
                    <option value="light">{t(locale, 'lightMode')}</option>
                  </select>
                </label>
              </section>
              <section>
                <h3>{t(locale, 'community')}</h3>
                <p>{t(locale, 'rollberryInfo')}</p>
                <button onClick={() => window.charberry.openExternal(CONTACT_URL)}>{CONTACT_EMAIL}</button>
                <button onClick={() => window.charberry.openExternal(GITHUB_URL)}>{t(locale, 'githubRepo')}</button>
                <button onClick={() => window.charberry.openExternal(ROLLBERRY_URL)}>{t(locale, 'rollberryGithub')}</button>
              </section>
            </div>
          </section>
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          locale={locale}
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => {
            if (contextMenu.kind === 'character') duplicateCharacter(contextMenu.id)
            if (contextMenu.kind === 'inventory') {
              const source = activeCharacter.inventoryItems.find((item) => item.id === contextMenu.id) ?? newInventoryItem()
              updateInventoryItems([...activeCharacter.inventoryItems, { ...source, id: newId() }])
            }
            if (contextMenu.kind === 'note') {
              const source = activeCharacter.sessionNotes.find((note) => note.id === contextMenu.id) ?? newSessionNote()
              updateSessionNotes([{ ...source, id: newId() }, ...activeCharacter.sessionNotes])
            }
            setContextMenu(null)
          }}
          onExport={exportActiveCharacter}
          onDelete={() => {
            if (contextMenu.kind === 'inventory') updateInventoryItems(activeCharacter.inventoryItems.filter((item) => item.id !== contextMenu.id))
            if (contextMenu.kind === 'note') updateSessionNotes(activeCharacter.sessionNotes.filter((note) => note.id !== contextMenu.id))
            setContextMenu(null)
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>
}

function TextCard({ title, value, onChange, large = false }: { title: string; value: string; onChange: (value: string) => void; large?: boolean }) {
  return (
    <section className={`card text-card ${large ? 'large' : ''}`}>
      <h2>{title}</h2>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </section>
  )
}

function InventoryCard({
  locale,
  character,
  onCurrency,
  onAdd,
  onUpdate,
  onDelete,
  onContextMenu,
}: {
  locale: Locale
  character: CharacterSheet
  onCurrency: (currency: CharacterSheet['currency']) => void
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<CharacterInventoryItem>) => void
  onDelete: (id: string) => void
  onContextMenu: (event: MouseEvent, id: string) => void
}) {
  return (
    <section className="card inventory-card">
      <div className="section-line">
        <h2>{t(locale, 'inventory')}</h2>
        <button onClick={onAdd}>{t(locale, 'addItem')}</button>
      </div>
      <div className="currency-row">
        {(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((coin) => (
          <label key={coin}>{coin.toUpperCase()}
            <input type="number" value={character.currency[coin]} onChange={(event) => onCurrency({ ...character.currency, [coin]: moneyValue(event.target.value) })} />
          </label>
        ))}
      </div>
      <div className="inventory-summary">
        <span>{t(locale, 'totalWeight')}: <strong>{totalWeight(character.inventoryItems)}</strong></span>
        <span>{t(locale, 'totalValue')}: <strong>{totalValueText(character.inventoryItems)}</strong></span>
      </div>
      <div className="inventory-table">
        {character.inventoryItems.map((item) => (
          <div className="inventory-row" key={item.id} onContextMenu={(event) => onContextMenu(event, item.id)}>
            <input aria-label="Item name" value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} />
            <input aria-label="Item quantity" type="number" min={1} value={item.quantity} onChange={(event) => onUpdate(item.id, { quantity: Math.max(1, numberValue(event.target.value, 1)) })} />
            <input aria-label="Item weight" type="number" min={0} step={0.1} value={item.weight} onChange={(event) => onUpdate(item.id, { weight: Math.max(0, numberValue(event.target.value, 0)) })} />
            <input aria-label="Item value" value={item.value} onChange={(event) => onUpdate(item.id, { value: event.target.value })} />
            <label className="check-line"><input type="checkbox" checked={item.equipped} onChange={(event) => onUpdate(item.id, { equipped: event.target.checked })} /> {t(locale, 'equipped')}</label>
            <input aria-label="Item notes" value={item.notes} onChange={(event) => onUpdate(item.id, { notes: event.target.value })} />
            <button className="icon-button danger" aria-label={`${t(locale, 'remove')} ${item.name}`} onClick={() => onDelete(item.id)}>x</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function SessionNotesCard({
  locale,
  notes,
  onAdd,
  onUpdate,
  onDelete,
  onContextMenu,
}: {
  locale: Locale
  notes: CharacterSessionNote[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<CharacterSessionNote>) => void
  onDelete: (id: string) => void
  onContextMenu: (event: MouseEvent, id: string) => void
}) {
  return (
    <section className="card session-card">
      <div className="section-line">
        <h2>{t(locale, 'sessionNotes')}</h2>
        <button onClick={onAdd}>{t(locale, 'addNote')}</button>
      </div>
      <div className="session-list">
        {notes.map((note) => (
          <div className="session-note" key={note.id} onContextMenu={(event) => onContextMenu(event, note.id)}>
            <div className="session-meta">
              <label>{t(locale, 'date')}<input type="date" value={note.date} onChange={(event) => onUpdate(note.id, { date: event.target.value })} /></label>
              <label>{t(locale, 'title')}<input aria-label="Session note title" value={note.title} onChange={(event) => onUpdate(note.id, { title: event.target.value })} /></label>
              <label>{t(locale, 'tags')}<input aria-label="Session note tags" value={note.tags.join(', ')} onChange={(event) => onUpdate(note.id, { tags: parseTags(event.target.value) })} /></label>
              <button className="icon-button danger" aria-label={`${t(locale, 'remove')} ${note.title}`} onClick={() => onDelete(note.id)}>x</button>
            </div>
            <textarea aria-label="Session note body" value={note.body} onChange={(event) => onUpdate(note.id, { body: event.target.value })} />
          </div>
        ))}
      </div>
    </section>
  )
}

function CharacterCreator({ locale, activeCharacter, onApply, onClose }: { locale: Locale; activeCharacter: CharacterSheet; onApply: (draft: CreatorDraft) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<CreatorDraft>({
    name: activeCharacter.name,
    ancestry: activeCharacter.ancestry || SRD_SPECIES[0].name,
    className: activeCharacter.className || SRD_CLASSES[4].name,
    background: activeCharacter.background || SRD_BACKGROUNDS[0].name,
    level: activeCharacter.level,
    abilityMethod: 'standard',
  })
  const pickedClass = classByName(draft.className)
  const pickedSpecies = speciesByName(draft.ancestry)
  const pickedBackground = backgroundByName(draft.background)
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t(locale, 'characterCreator')}>
      <section className="wizard-modal">
        <div className="section-line">
          <h2>{t(locale, 'characterCreator')}</h2>
          <button onClick={onClose}>{t(locale, 'close')}</button>
        </div>
        <div className="wizard-grid">
          <label>{t(locale, 'name')}<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>{t(locale, 'ancestry')}
            <select value={draft.ancestry} onChange={(event) => setDraft({ ...draft, ancestry: event.target.value })}>
              {SRD_SPECIES.map((item) => <option key={item.name} value={item.name}>{speciesLabel(locale, item.name)}</option>)}
            </select>
          </label>
          <label>{t(locale, 'class')}
            <select value={draft.className} onChange={(event) => setDraft({ ...draft, className: event.target.value })}>
              {SRD_CLASSES.map((item) => <option key={item.name} value={item.name}>{classLabel(locale, item.name)}</option>)}
            </select>
          </label>
          <label>{t(locale, 'background')}
            <select value={draft.background} onChange={(event) => setDraft({ ...draft, background: event.target.value })}>
              {SRD_BACKGROUNDS.map((item) => <option key={item.name} value={item.name}>{backgroundLabel(locale, item.name)}</option>)}
            </select>
          </label>
          <label>{t(locale, 'level')}<input type="number" min={1} max={20} value={draft.level} onChange={(event) => setDraft({ ...draft, level: Math.max(1, Math.min(20, numberValue(event.target.value, 1))) })} /></label>
          <label>{t(locale, 'abilityMethod')}
            <select value={draft.abilityMethod} onChange={(event) => setDraft({ ...draft, abilityMethod: event.target.value as CreatorDraft['abilityMethod'] })}>
              <option value="standard">{t(locale, 'standardArray')}</option>
              <option value="manual">{t(locale, 'manual')}</option>
            </select>
          </label>
        </div>
        <div className="wizard-preview">
          <span>{pickedClass.hitDie}</span>
          <span>{pickedSpecies.speed} ft</span>
          <span>{classLabel(locale, pickedClass.name)} / {speciesLabel(locale, pickedSpecies.name)} / {backgroundLabel(locale, pickedBackground.name)}</span>
          <span>{[...pickedClass.features, ...pickedSpecies.features, ...pickedBackground.features].join(', ')}</span>
        </div>
        <button className="primary wizard-apply" onClick={() => onApply(draft)}>{t(locale, 'applyTemplate')}</button>
      </section>
    </div>
  )
}

function ContextMenu({ locale, menu, onClose, onDuplicate, onExport, onDelete }: {
  locale: Locale
  menu: ContextMenuState
  onClose: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
}) {
  return (
    <div className="context-scrim" onClick={onClose}>
      <div className="context-menu" style={{ left: menu.x, top: menu.y }} role="menu" aria-label={t(locale, 'actionMenu')} onClick={(event) => event.stopPropagation()}>
        <button onClick={onDuplicate}>{t(locale, 'duplicate')}</button>
        {menu.kind === 'character' && <button onClick={() => { void onExport(); onClose() }}>{t(locale, 'exportCharacter')}</button>}
        {menu.kind !== 'character' && <button className="danger" onClick={onDelete}>{t(locale, 'delete')}</button>}
      </div>
    </div>
  )
}
