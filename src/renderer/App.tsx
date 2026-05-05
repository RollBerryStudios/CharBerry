import { useEffect, useMemo, useRef, useState } from 'react'
import type { AbilityKey, CharacterAttack, CharacterLibrary, CharacterSheet, CharacterSpell, SkillRank } from '../preload/preload'
import logoUrl from '../../resources/logo.png'

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

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'combat', label: 'Combat' },
  { id: 'skills', label: 'Skills' },
  { id: 'story', label: 'Story' },
  { id: 'notes', label: 'Notes' },
]

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
    attacks: [],
    spells: [],
    inventory: '',
    features: '',
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

function emptyLibrary(): CharacterLibrary {
  const character = emptyCharacter()
  return { version: 1, activeCharacterId: character.id, characters: [character] }
}

function numberValue(value: string, fallback = 0): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export default function App() {
  const [library, setLibrary] = useState<CharacterLibrary>(emptyLibrary)
  const [ready, setReady] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabId>('overview')
  const [toast, setToast] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeCharacter = library.characters.find((character) => character.id === library.activeCharacterId) ?? library.characters[0]

  useEffect(() => {
    void window.charberry.loadLibrary().then((loaded) => {
      setLibrary(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void window.charberry.saveLibrary(library), 250)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [library, ready])

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

  async function deleteCharacter(): Promise<void> {
    if (!activeCharacter || library.characters.length <= 1) return
    const ok = await window.charberry.confirm(`Delete ${activeCharacter.name}?`, 'This removes the character from the local CharBerry library.')
    if (!ok) return
    setLibrary((current) => {
      const characters = current.characters.filter((character) => character.id !== activeCharacter.id)
      return { ...current, characters, activeCharacterId: characters[0]?.id ?? null }
    })
  }

  async function importLibrary(): Promise<void> {
    const imported = await window.charberry.importLibrary()
    if (!imported) return
    setLibrary(imported)
    notify('Library imported')
  }

  function upsertAttack(id: string, patch: Partial<CharacterAttack>): void {
    updateActive({ attacks: activeCharacter.attacks.map((attack) => attack.id === id ? { ...attack, ...patch } : attack) })
  }

  function upsertSpell(id: string, patch: Partial<CharacterSpell>): void {
    updateActive({ spells: activeCharacter.spells.map((spell) => spell.id === id ? { ...spell, ...patch } : spell) })
  }

  if (!ready || !activeCharacter) return <div className="loading">Loading CharBerry...</div>

  const passivePerception = 10 + skillBonus(activeCharacter, 'perception')
  const passiveInsight = 10 + skillBonus(activeCharacter, 'insight')
  const initiative = modifier(activeCharacter.abilityScores.dex) + activeCharacter.initiativeBonus

  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="brand">
          <img src={logoUrl} alt="" />
          <div>
            <strong>CharBerry</strong>
            <span>Interactive character sheets for tabletop rounds</span>
          </div>
        </div>
        <div className="titlebar-actions">
          <button onClick={() => window.charberry.exportLibrary(library)}>Export</button>
          <button onClick={importLibrary}>Import</button>
          <button onClick={() => window.charberry.revealData()}>Data Folder</button>
        </div>
      </header>

      <main className="char-layout">
        <aside className="roster-panel">
          <div className="panel-head">
            <div>
              <h2>Characters</h2>
              <p>{library.characters.length} saved sheets</p>
            </div>
            <button className="primary" onClick={addCharacter}>New</button>
          </div>
          <input aria-label="Search characters" className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search character library" />
          <div className="roster-list">
            {filteredCharacters.map((character) => (
              <button
                key={character.id}
                className={`roster-card ${character.id === activeCharacter.id ? 'active' : ''}`}
                onClick={() => setLibrary((current) => ({ ...current, activeCharacterId: character.id }))}
              >
                <span className="avatar">{character.name.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{character.name}</strong>
                  <em>Level {character.level} {character.ancestry} {character.className}</em>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="sheet-panel">
          <div className="hero-sheet">
            <div className="portrait">{activeCharacter.name.slice(0, 1).toUpperCase()}</div>
            <div className="identity-grid">
              <label>Name<input value={activeCharacter.name} onChange={(event) => updateActive({ name: event.target.value })} /></label>
              <label>Ancestry<input value={activeCharacter.ancestry} onChange={(event) => updateActive({ ancestry: event.target.value })} /></label>
              <label>Class<input value={activeCharacter.className} onChange={(event) => updateActive({ className: event.target.value })} /></label>
              <label>Subclass<input value={activeCharacter.subclass} onChange={(event) => updateActive({ subclass: event.target.value })} /></label>
              <label>Level<input type="number" min={1} max={20} value={activeCharacter.level} onChange={(event) => updateActive({ level: numberValue(event.target.value, 1) })} /></label>
              <label>Background<input value={activeCharacter.background} onChange={(event) => updateActive({ background: event.target.value })} /></label>
            </div>
            <button className="danger delete-character" disabled={library.characters.length <= 1} onClick={deleteCharacter}>Delete</button>
          </div>

          <div className="derived-strip">
            <Stat label="Proficiency" value={formatBonus(proficiency(activeCharacter.level))} />
            <Stat label="Initiative" value={formatBonus(initiative)} />
            <Stat label="Passive Perception" value={String(passivePerception)} />
            <Stat label="Passive Insight" value={String(passiveInsight)} />
            <Stat label="Spell DC" value={String(spellDc(activeCharacter))} />
            <Stat label="Spell Attack" value={formatBonus(spellAttack(activeCharacter))} />
          </div>

          <nav className="tabs" aria-label="Character sections">
            {TABS.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}
          </nav>

          <div className="tab-content">
            {tab === 'overview' && (
              <div className="content-grid overview-grid">
                <section className="card ability-card">
                  <h2>Ability Scores</h2>
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
                  <h2>Vitals</h2>
                  <div className="form-grid three">
                    <label>Armor Class<input type="number" value={activeCharacter.armorClass} onChange={(event) => updateActive({ armorClass: numberValue(event.target.value, 10) })} /></label>
                    <label>Speed<input type="number" value={activeCharacter.speed} onChange={(event) => updateActive({ speed: numberValue(event.target.value, 30) })} /></label>
                    <label>Hit Dice<input value={activeCharacter.hitDice} onChange={(event) => updateActive({ hitDice: event.target.value })} /></label>
                    <label>Current HP<input type="number" value={activeCharacter.hpCurrent} onChange={(event) => updateActive({ hpCurrent: numberValue(event.target.value) })} /></label>
                    <label>Max HP<input type="number" value={activeCharacter.hpMax} onChange={(event) => updateActive({ hpMax: numberValue(event.target.value) })} /></label>
                    <label>Temp HP<input type="number" value={activeCharacter.hpTemp} onChange={(event) => updateActive({ hpTemp: numberValue(event.target.value) })} /></label>
                    <label>Alignment<input value={activeCharacter.alignment} onChange={(event) => updateActive({ alignment: event.target.value })} /></label>
                    <label>XP<input type="number" value={activeCharacter.xp} onChange={(event) => updateActive({ xp: numberValue(event.target.value) })} /></label>
                    <label className="check-line"><input type="checkbox" checked={activeCharacter.inspiration} onChange={(event) => updateActive({ inspiration: event.target.checked })} /> Inspiration</label>
                  </div>
                </section>
              </div>
            )}

            {tab === 'combat' && (
              <div className="content-grid combat-grid">
                <section className="card">
                  <div className="section-line">
                    <h2>Attacks</h2>
                    <button onClick={() => updateActive({ attacks: [...activeCharacter.attacks, { id: newId(), name: 'New Attack', bonus: '', damage: '', damageType: '', range: '', notes: '' }] })}>Add Attack</button>
                  </div>
                  <div className="rows">
                    {activeCharacter.attacks.map((attack) => (
                      <div className="attack-row" key={attack.id}>
                        <input aria-label="Attack name" value={attack.name} onChange={(event) => upsertAttack(attack.id, { name: event.target.value })} />
                        <input aria-label="Attack bonus" value={attack.bonus} onChange={(event) => upsertAttack(attack.id, { bonus: event.target.value })} />
                        <input aria-label="Attack damage" value={attack.damage} onChange={(event) => upsertAttack(attack.id, { damage: event.target.value })} />
                        <input aria-label="Attack range" value={attack.range} onChange={(event) => upsertAttack(attack.id, { range: event.target.value })} />
                        <button className="icon-button danger" aria-label={`Remove ${attack.name}`} onClick={() => updateActive({ attacks: activeCharacter.attacks.filter((item) => item.id !== attack.id) })}>x</button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card">
                  <div className="section-line">
                    <h2>Spells</h2>
                    <button onClick={() => updateActive({ spells: [...activeCharacter.spells, { id: newId(), level: 1, name: 'New Spell', prepared: true, notes: '' }] })}>Add Spell</button>
                  </div>
                  <label>Spellcasting Ability
                    <select value={activeCharacter.spellcastingAbility} onChange={(event) => updateActive({ spellcastingAbility: event.target.value as AbilityKey })}>
                      {ABILITIES.map((ability) => <option key={ability.key} value={ability.key}>{ability.label}</option>)}
                    </select>
                  </label>
                  <div className="rows">
                    {activeCharacter.spells.map((spell) => (
                      <div className="spell-row" key={spell.id}>
                        <input aria-label="Spell name" value={spell.name} onChange={(event) => upsertSpell(spell.id, { name: event.target.value })} />
                        <input aria-label="Spell level" type="number" min={0} max={9} value={spell.level} onChange={(event) => upsertSpell(spell.id, { level: numberValue(event.target.value) })} />
                        <label className="check-line"><input type="checkbox" checked={spell.prepared} onChange={(event) => upsertSpell(spell.id, { prepared: event.target.checked })} /> Prepared</label>
                        <button className="icon-button danger" aria-label={`Remove ${spell.name}`} onClick={() => updateActive({ spells: activeCharacter.spells.filter((item) => item.id !== spell.id) })}>x</button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === 'skills' && (
              <div className="content-grid skills-grid">
                <section className="card">
                  <h2>Saving Throws</h2>
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
                  <h2>Skills</h2>
                  <div className="skill-table">
                    {SKILLS.map((skill) => (
                      <div className="skill-row" key={skill.key}>
                        <strong>{formatBonus(skillBonus(activeCharacter, skill.key))}</strong>
                        <span>{skill.label}</span>
                        <em>{skill.ability.toUpperCase()}</em>
                        <select value={activeCharacter.skills[skill.key] ?? 'none'} onChange={(event) => updateSkill(skill.key, event.target.value as SkillRank)}>
                          <option value="none">None</option>
                          <option value="proficient">Proficient</option>
                          <option value="expertise">Expertise</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === 'story' && (
              <div className="content-grid story-grid">
                <TextCard title="Personality" value={activeCharacter.personality} onChange={(value) => updateActive({ personality: value })} />
                <TextCard title="Ideals" value={activeCharacter.ideals} onChange={(value) => updateActive({ ideals: value })} />
                <TextCard title="Bonds" value={activeCharacter.bonds} onChange={(value) => updateActive({ bonds: value })} />
                <TextCard title="Flaws" value={activeCharacter.flaws} onChange={(value) => updateActive({ flaws: value })} />
                <TextCard title="Backstory" value={activeCharacter.backstory} onChange={(value) => updateActive({ backstory: value })} large />
                <TextCard title="Features" value={activeCharacter.features} onChange={(value) => updateActive({ features: value })} large />
              </div>
            )}

            {tab === 'notes' && (
              <div className="content-grid notes-grid">
                <TextCard title="Inventory" value={activeCharacter.inventory} onChange={(value) => updateActive({ inventory: value })} large />
                <TextCard title="Session Notes" value={activeCharacter.notes} onChange={(value) => updateActive({ notes: value })} large />
              </div>
            )}
          </div>
        </section>
      </main>
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
