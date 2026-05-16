'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CharacterLinkCard } from '@/components/characters/CharacterLink'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink, User, CharacterFullData } from '@/types'
import {
  Heart, Shield, Eye, ExternalLink, RefreshCw,
  ChevronDown, ChevronRight, Sparkles, RotateCcw, Plus, Minus,
  BookOpen, Swords, Star,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────
function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0
  if (pct > 0.6) return 'bg-emerald-500'
  if (pct > 0.3) return 'bg-yellow-500'
  return 'bg-red-500'
}
function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }

const SPELL_SCHOOLS: Record<string, string> = {
  abjuration: 'Bannmagie', conjuration: 'Beschwörung', divination: 'Weissagung',
  enchantment: 'Verzauberung', evocation: 'Hervorrufung', illusion: 'Illusion',
  necromancy: 'Nekromantie', transmutation: 'Verwandlung',
}
const SCHOOL_COLORS: Record<string, string> = {
  abjuration:   'bg-blue-900/40 text-blue-300 border-blue-700/30',
  conjuration:  'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
  divination:   'bg-cyan-900/40 text-cyan-300 border-cyan-700/30',
  enchantment:  'bg-pink-900/40 text-pink-300 border-pink-700/30',
  evocation:    'bg-red-900/40 text-red-300 border-red-700/30',
  illusion:     'bg-violet-900/40 text-violet-300 border-violet-700/30',
  necromancy:   'bg-emerald-900/40 text-emerald-300 border-emerald-700/30',
  transmutation:'bg-orange-900/40 text-orange-300 border-orange-700/30',
}

// ── Roll Toast ─────────────────────────────────────────────────────────────────
interface RollResult {
  id: number
  label: string
  d20: number
  bonus: number
  total: number
}

function RollToast({ roll, onClose }: { roll: RollResult; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200)
    return () => clearTimeout(t)
  }, [roll.id, onClose])

  const isCrit   = roll.d20 === 20
  const isFumble = roll.d20 === 1

  return (
    <div
      onClick={onClose}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] cursor-pointer select-none"
    >
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl border text-sm font-semibold backdrop-blur-sm animate-in slide-in-from-top-2 duration-200 ${
        isCrit   ? 'bg-amber-900/95 border-amber-500/60 text-amber-100' :
        isFumble ? 'bg-red-900/95 border-red-500/60 text-red-100' :
                   'bg-zinc-800/95 border-zinc-600/60 text-zinc-100'
      }`}>
        <span className="text-lg">{isCrit ? '⭐' : isFumble ? '💀' : '🎲'}</span>
        <span className="text-zinc-400 font-normal text-xs">{roll.label}</span>
        <span className="tabular-nums">{roll.d20}</span>
        {roll.bonus !== 0 && (
          <span className={`text-xs font-normal ${roll.bonus > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {modSign(roll.bonus)}
          </span>
        )}
        <span className="text-zinc-500 text-xs">=</span>
        <span className={`text-xl font-black tabular-nums ${
          isCrit ? 'text-amber-300' : isFumble ? 'text-red-300' : 'text-white'
        }`}>{roll.total}</span>
        {isCrit   && <span className="text-[10px] text-amber-400 font-bold tracking-wide">KRIT!</span>}
        {isFumble && <span className="text-[10px] text-red-400 font-bold tracking-wide">PATZER!</span>}
      </div>
    </div>
  )
}

// ── Clickable Modifier ─────────────────────────────────────────────────────────
function ClickableMod({
  bonus, label, onRoll, className = '',
}: {
  bonus: number; label: string
  onRoll: (bonus: number, label: string) => void
  className?: string
}) {
  const [rolling, setRolling] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (rolling) return
    setRolling(true)
    onRoll(bonus, label)
    setTimeout(() => setRolling(false), 400)
  }

  return (
    <button
      onClick={handleClick}
      title={`w20 ${modSign(bonus)} würfeln (${label})`}
      className={`inline-flex items-center gap-0.5 font-bold cursor-pointer transition-all active:scale-90
        hover:text-amber-300 group rounded px-0.5 ${rolling ? 'animate-bounce text-amber-400' : ''} ${className}`}
    >
      {modSign(bonus)}
      <span className="opacity-0 group-hover:opacity-50 text-[9px] transition-opacity leading-none">🎲</span>
    </button>
  )
}

// ── Spell Slot Tracker ─────────────────────────────────────────────────────────
interface SpellSlots {
  [level: string]: { max: number; used: number }
}
const SPELL_LEVEL_LABELS: Record<string, string> = {
  '1': '1. Grad', '2': '2. Grad', '3': '3. Grad', '4': '4. Grad', '5': '5. Grad',
  '6': '6. Grad', '7': '7. Grad', '8': '8. Grad', '9': '9. Grad',
}

function SpellSlotTracker({
  linkId, slots, onUpdate, readonly = false,
}: {
  linkId: string; slots: SpellSlots
  onUpdate: (newSlots: SpellSlots) => void; readonly?: boolean
}) {
  const supabase = createClient()
  const [localSlots, setLocalSlots] = useState<SpellSlots>(slots)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => { setLocalSlots(slots) }, [JSON.stringify(slots)]) // eslint-disable-line react-hooks/exhaustive-deps

  const levels = Object.keys(SPELL_LEVEL_LABELS).filter(l => localSlots[l] !== undefined)

  const save = async (updated: SpellSlots) => {
    await supabase.from('character_links').update({ spell_slots: updated }).eq('id', linkId)
    onUpdate(updated)
  }

  const changeUsed = (level: string, delta: number) => {
    if (readonly) return
    const slot = localSlots[level]; if (!slot) return
    const newUsed = Math.max(0, Math.min(slot.max, slot.used + delta))
    const updated = { ...localSlots, [level]: { ...slot, used: newUsed } }
    setLocalSlots(updated); save(updated)
  }

  const changeMax = (level: string, delta: number) => {
    const slot = localSlots[level] ?? { max: 0, used: 0 }
    const newMax = Math.max(0, slot.max + delta)
    const updated = { ...localSlots, [level]: { max: newMax, used: Math.min(slot.used, newMax) } }
    setLocalSlots(updated); save(updated)
  }

  const addLevel = (level: string) => {
    if (localSlots[level]) return
    const updated = { ...localSlots, [level]: { max: 1, used: 0 } }
    setLocalSlots(updated); save(updated)
  }

  const removeLevel = (level: string) => {
    const updated = { ...localSlots }; delete updated[level]
    setLocalSlots(updated); save(updated)
  }

  const resetAll = () => {
    const updated: SpellSlots = {}
    for (const [k, v] of Object.entries(localSlots)) updated[k] = { ...v, used: 0 }
    setLocalSlots(updated); save(updated)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold">Zauberschlitze</span>
        </div>
        {!readonly && (
          <div className="flex items-center gap-1">
            <button onClick={resetAll} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 transition-colors" title="Alle Slots zurücksetzen">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button onClick={() => setEditMode(e => !e)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${editMode ? 'text-amber-400 bg-amber-600/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
              {editMode ? 'Fertig' : 'Bearbeiten'}
            </button>
          </div>
        )}
      </div>

      {levels.length === 0 && !editMode && (
        <p className="text-xs text-zinc-600 py-2 text-center">Keine Zaubergrade konfiguriert</p>
      )}

      {levels.map(level => {
        const slot = localSlots[level]
        return (
          <div key={level} className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 w-14 flex-shrink-0">{SPELL_LEVEL_LABELS[level] ?? `Grad ${level}`}</span>
            <div className="flex gap-1 flex-1">
              {Array.from({ length: slot.max }, (_, i) => (
                <button key={i}
                  onClick={() => !readonly && changeUsed(level, i < (slot.max - slot.used) ? 1 : -1)}
                  title={i < (slot.max - slot.used) ? 'Slot verbrauchen' : 'Slot wiederherstellen'}
                  className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${
                    i < (slot.max - slot.used) ? 'bg-purple-500 border-purple-400' : 'bg-transparent border-zinc-600'
                  } ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                />
              ))}
            </div>
            <span className="text-[11px] text-zinc-400 w-10 text-right flex-shrink-0">{slot.max - slot.used}/{slot.max}</span>
            {editMode && !readonly && (
              <div className="flex items-center gap-1">
                <button onClick={() => changeMax(level, -1)} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"><Minus className="w-3 h-3" /></button>
                <button onClick={() => changeMax(level, 1)}  className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"><Plus  className="w-3 h-3" /></button>
                <button onClick={() => removeLevel(level)}   className="w-5 h-5 rounded bg-red-900/40 hover:bg-red-900/70 flex items-center justify-center text-red-400 text-[10px]">×</button>
              </div>
            )}
          </div>
        )
      })}

      {editMode && !readonly && (
        <div className="flex flex-wrap gap-1 pt-1">
          {Object.keys(SPELL_LEVEL_LABELS).filter(l => !localSlots[l]).map(level => (
            <button key={level} onClick={() => addLevel(level)}
              className="px-2 py-0.5 rounded text-[11px] text-purple-400 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-800/30 transition-colors">
              + Grad {level}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Spellbook List ─────────────────────────────────────────────────────────────
function SpellbookList({ spells }: {
  spells: Array<{ name: string; level: number; school: string }>
}) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? spells.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : spells

  const byLevel = filtered.reduce<Record<number, typeof filtered>>((acc, s) => {
    ;(acc[s.level] ??= []).push(s)
    return acc
  }, {})
  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)

  if (spells.length === 0) {
    return <p className="text-xs text-zinc-600 py-4 text-center">Keine Zauber in den Charakterdaten gefunden</p>
  }

  return (
    <div className="space-y-3">
      {spells.length > 6 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zauber suchen…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-600"
        />
      )}
      {levels.length === 0 && (
        <p className="text-xs text-zinc-600 py-2 text-center">Keine Treffer</p>
      )}
      {levels.map(level => (
        <div key={level}>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-purple-500" />
            {level === 0 ? 'Zaubertricks' : `${level}. Grad`}
            <span className="text-zinc-600 font-normal normal-case tracking-normal">({byLevel[level].length})</span>
          </p>
          <div className="space-y-1">
            {byLevel[level].map((spell, i) => {
              const school = spell.school.toLowerCase()
              return (
                <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                  <span className="text-purple-500 text-[10px]">✦</span>
                  <span className="text-zinc-200 flex-1">{spell.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SCHOOL_COLORS[school] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {SPELL_SCHOOLS[school] ?? spell.school}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── GM Character Card ──────────────────────────────────────────────────────────
function GMCharacterCard({ c, onRefresh, onSlotsUpdate, onHpUpdate, onRoll }: {
  c: CharacterLink & { user: User }
  onRefresh: (id: string) => void
  onSlotsUpdate: (id: string, slots: SpellSlots) => void
  onHpUpdate: (id: string, hp: number) => void
  onRoll: (bonus: number, label: string) => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'attribute' | 'fertigkeiten' | 'zauber'>('attribute')
  const [hpEditVal, setHpEditVal] = useState('')
  const [editingHp, setEditingHp] = useState(false)
  const hpInputRef = useRef<HTMLInputElement>(null)

  const d: CharacterFullData | null = (c.full_data as CharacterFullData | undefined) ?? null
  const maxHp    = d?.max_hp ?? 0
  const currentHp = (c as any).current_hp ?? maxHp
  const slots: SpellSlots = (c as any).spell_slots ?? {}
  const hasSpellSlots = Object.keys(slots).length > 0
  const hasSpells     = (d?.spells ?? []).length > 0

  const passivePerception    = d ? 10 + (d.skills.find(s => s.key === 'perception')?.bonus    ?? 0) : null
  const passiveInsight       = d ? 10 + (d.skills.find(s => s.key === 'insight')?.bonus       ?? 0) : null
  const passiveInvestigation = d ? 10 + (d.skills.find(s => s.key === 'investigation')?.bonus ?? 0) : null

  const applyHp = async (newHp: number) => {
    const clamped = Math.max(0, Math.min(maxHp, newHp))
    onHpUpdate(c.id, clamped)
    await supabase.from('character_links').update({ current_hp: clamped }).eq('id', c.id)
  }

  const startHpEdit = () => {
    setHpEditVal(String(currentHp))
    setEditingHp(true)
    setTimeout(() => hpInputRef.current?.select(), 30)
  }

  const commitHpEdit = () => {
    const n = parseInt(hpEditVal, 10)
    if (!isNaN(n)) applyHp(n)
    setEditingHp(false)
  }

  const STAT_LABELS: Record<string, string> = {
    STR: 'Stärke', DEX: 'Geschicklichkeit', CON: 'Konstitution',
    INT: 'Intelligenz', WIS: 'Weisheit', CHA: 'Charisma',
  }

  const tabs = [
    { id: 'attribute',    label: 'Attribute',    icon: Star },
    { id: 'fertigkeiten', label: 'Fertigkeiten', icon: Swords },
    ...(hasSpells ? [{ id: 'zauber', label: 'Zauber', icon: BookOpen }] : []),
  ] as const

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-base font-bold text-zinc-200 flex-shrink-0">
          {(c.user as any)?.avatar_emoji ?? c.user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500">{c.user?.username}</p>
          <p className="text-base font-bold text-zinc-100 leading-tight truncate">{c.character_name}</p>
          <p className="text-xs text-zinc-400">{c.class_name} · Stufe {c.level}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onRefresh(c.id)} className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors" title="Daten aktualisieren">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {c.dnd_beyond_url && (
            <a href={c.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="DnD Beyond">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {d ? (
        <>
          {/* Combat stats summary */}
          <div className="px-4 py-3 space-y-2.5">

            {/* HP bar with GM editing */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span>HP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => applyHp(currentHp - 1)}
                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-red-900/50 flex items-center justify-center text-zinc-400 hover:text-red-300 transition-colors"
                  ><Minus className="w-3 h-3" /></button>

                  {editingHp ? (
                    <input
                      ref={hpInputRef}
                      value={hpEditVal}
                      onChange={e => setHpEditVal(e.target.value)}
                      onBlur={commitHpEdit}
                      onKeyDown={e => { if (e.key === 'Enter') commitHpEdit(); if (e.key === 'Escape') setEditingHp(false) }}
                      className="w-16 text-center text-sm font-bold text-zinc-100 bg-zinc-800 border border-amber-600/60 rounded px-1 py-0.5 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={startHpEdit}
                      title="HP direkt eingeben"
                      className="text-sm font-bold text-zinc-100 hover:text-amber-300 transition-colors tabular-nums min-w-[3.5rem] text-center"
                    >
                      {currentHp} / {maxHp}
                    </button>
                  )}

                  <button
                    onClick={() => applyHp(currentHp + 1)}
                    className="w-5 h-5 rounded bg-zinc-800 hover:bg-emerald-900/50 flex items-center justify-center text-zinc-400 hover:text-emerald-300 transition-colors"
                  ><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${hpColor(currentHp, maxHp)}`}
                  style={{ width: `${maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <Shield className="w-3 h-3 text-zinc-400 mx-auto mb-0.5" />
                <p className="text-lg font-black text-zinc-100">{d.armor_class}</p>
                <p className="text-[10px] text-zinc-500">RK</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-amber-400">
                  <ClickableMod bonus={d.initiative} label="Initiative" onRoll={onRoll} className="text-amber-400" />
                </p>
                <p className="text-[10px] text-zinc-500">Init</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">{d.speed}</p>
                <p className="text-[10px] text-zinc-500">Tempo</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">
                  <ClickableMod bonus={d.proficiency_bonus} label="Übungsbonus" onRoll={onRoll} className="text-zinc-100" />
                </p>
                <p className="text-[10px] text-zinc-500">Prof</p>
              </div>
            </div>

            {/* Passive values */}
            {passivePerception !== null && (
              <div className="flex gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-1 text-zinc-400">
                  <Eye className="w-3 h-3 text-zinc-500" />
                  Wahrnehmung <span className="font-bold text-zinc-100">{passivePerception}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  Einsicht <span className="font-bold text-zinc-100">{passiveInsight}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  Nachforschung <span className="font-bold text-zinc-100">{passiveInvestigation}</span>
                </div>
              </div>
            )}

            {/* Spell Slot Tracker (read-only for GM) */}
            {hasSpellSlots && (
              <div className="pt-1 border-t border-zinc-800/60">
                <SpellSlotTracker
                  linkId={c.id} slots={slots}
                  onUpdate={(s) => onSlotsUpdate(c.id, s)}
                  readonly={true}
                />
              </div>
            )}
          </div>

          {/* Expanded details */}
          {open && (
            <div className="border-t border-zinc-800">
              {/* Tab bar */}
              <div className="flex border-b border-zinc-800">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                      activeTab === id
                        ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              <div className="px-4 py-3 space-y-3">

                {/* ATTRIBUTE TAB */}
                {activeTab === 'attribute' && (
                  <>
                    {/* Ability scores */}
                    <div>
                      <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-2">Attribute</p>
                      <div className="grid grid-cols-6 gap-1.5">
                        {(['STR','DEX','CON','INT','WIS','CHA'] as const).map(ab => {
                          const score = d.stats[ab] ?? 10
                          const mod   = Math.floor((score - 10) / 2)
                          return (
                            <div key={ab} className="text-center bg-zinc-800/60 rounded-lg py-1.5">
                              <p className="text-[10px] text-zinc-500">{ab}</p>
                              <ClickableMod
                                bonus={mod}
                                label={STAT_LABELS[ab] ?? ab}
                                onRoll={onRoll}
                                className="text-xs text-zinc-100"
                              />
                              <p className="text-[10px] text-zinc-600">{score}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Saving throws */}
                    <div>
                      <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-2">Rettungswürfe</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(d.saves ?? []).map(s => (
                          <div key={s.ability} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${
                            s.proficient ? 'bg-amber-900/30 border-amber-700/40' : 'bg-zinc-800 border-zinc-700'
                          }`}>
                            {s.proficient && <span className="text-amber-400 text-[8px]">●</span>}
                            <span className={s.proficient ? 'text-amber-300' : 'text-zinc-400'}>{s.ability}</span>
                            <ClickableMod
                              bonus={s.bonus}
                              label={`Rettungswurf ${s.ability}`}
                              onRoll={onRoll}
                              className={s.proficient ? 'text-amber-300' : 'text-zinc-400'}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equipped weapons */}
                    {(d.weapons ?? []).filter(w => w.equipped).length > 0 && (
                      <div>
                        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-2">Ausgerüstete Waffen</p>
                        <div className="space-y-1.5">
                          {d.weapons.filter(w => w.equipped).map((w, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/40 rounded-lg px-2.5 py-1.5">
                              <span className="text-amber-500 text-sm">⚔</span>
                              <span className="text-zinc-200 flex-1 font-medium">{w.name}</span>
                              <div className="flex items-center gap-1 text-zinc-400">
                                Atk <ClickableMod bonus={w.attackBonus} label={`Angriff: ${w.name}`} onRoll={onRoll} className="text-zinc-300" />
                              </div>
                              <span className="text-zinc-500">{w.damage}{w.damageBonus !== 0 ? modSign(w.damageBonus) : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* FERTIGKEITEN TAB */}
                {activeTab === 'fertigkeiten' && (
                  <div>
                    <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wide mb-2">Fertigkeiten</p>
                    <div className="space-y-0.5">
                      {(d.skills ?? []).sort((a, b) => a.nameDe.localeCompare(b.nameDe)).map(sk => (
                        <div key={sk.key} className="flex items-center gap-2 text-xs py-0.5">
                          {sk.proficient || sk.expertise ? (
                            <span className={`text-[8px] ${sk.expertise ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {sk.expertise ? '◆' : '●'}
                            </span>
                          ) : (
                            <span className="text-[8px] text-zinc-700">○</span>
                          )}
                          <span className="text-zinc-300 flex-1">{sk.nameDe}</span>
                          <span className="text-[10px] text-zinc-600">{sk.ability}</span>
                          <ClickableMod bonus={sk.bonus} label={sk.nameDe} onRoll={onRoll} className="text-zinc-300 w-8 text-right" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ZAUBER TAB */}
                {activeTab === 'zauber' && hasSpells && (
                  <SpellbookList spells={d.spells} />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-4">
          <p className="text-xs text-zinc-500">Keine Charakterdaten geladen. Spieler muss den Charakter verlinken und synchronisieren.</p>
        </div>
      )}
    </div>
  )
}

// ── Player Character Tabs ──────────────────────────────────────────────────────
function PlayerCharacterTabs({
  linkId, slots, spells, onSlotsUpdate,
}: {
  linkId: string
  slots: SpellSlots
  spells: Array<{ name: string; level: number; school: string }>
  onSlotsUpdate: (s: SpellSlots) => void
}) {
  const hasSpells = spells.length > 0
  const [tab, setTab] = useState<'schlitze' | 'zauber'>('schlitze')

  const tabs = [
    { id: 'schlitze', label: 'Zauberschlitze', icon: Sparkles },
    ...(hasSpells ? [{ id: 'zauber', label: 'Zauber', icon: BookOpen }] : []),
  ] as const

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === id
                ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        {tab === 'schlitze' && (
          <SpellSlotTracker
            linkId={linkId} slots={slots}
            onUpdate={onSlotsUpdate} readonly={false}
          />
        )}
        {tab === 'zauber' && <SpellbookList spells={spells} />}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CharactersPage() {
  const { user, isGM } = useAuth()
  const supabase = createClient()
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [allCharacters, setAllCharacters] = useState<(CharacterLink & { user: User })[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null)
  const rollCounterRef = useRef(0)

  const fetchAll = useCallback(async () => {
    if (!user) return
    if (isGM) {
      const { data } = await supabase
        .from('character_links')
        .select('*, user:profiles(id, username, role, avatar_url, avatar_emoji, display_name)')
        .order('created_at')
      setAllCharacters(data ?? [])
    } else {
      const { data } = await supabase
        .from('character_links')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setCharacter(data)
    }
    setLoading(false)
  }, [user, isGM]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user, fetchAll])

  // ── Roll handler ──
  const handleRoll = useCallback(async (bonus: number, label: string) => {
    const d20    = Math.floor(Math.random() * 20) + 1
    const total  = d20 + bonus
    rollCounterRef.current += 1
    setLastRoll({ id: rollCounterRef.current, label, d20, bonus, total })

    if (!user) return
    try {
      await supabase.from('dice_rolls').insert({
        user_id:     user.id,
        dice_config: [{ type: 'd20', count: 1 }],
        results:     [[d20]],
        total,
        label:       `${label} (${modSign(bonus)})`,
      })
    } catch {}
  }, [user, supabase])

  // ── GM updates ──
  const handleGMSlotsUpdate = (linkId: string, slots: SpellSlots) => {
    setAllCharacters(prev => prev.map(c => c.id === linkId ? { ...c, spell_slots: slots } as any : c))
  }

  const handleGMHpUpdate = (linkId: string, hp: number) => {
    setAllCharacters(prev => prev.map(c => c.id === linkId ? { ...c, current_hp: hp } as any : c))
  }

  const handleRefresh = async (linkId: string) => {
    const link = allCharacters.find(c => c.id === linkId)
    if (!link) return
    try {
      const res = await fetch(`/api/dnd-character?url=${encodeURIComponent(link.dnd_beyond_url)}`)
      if (!res.ok) return
      const data = await res.json()
      await supabase.from('character_links').update({
        full_data:      data,
        character_name: data.character_name,
        class_name:     data.class_name,
        level:          data.level,
        updated_at:     new Date().toISOString(),
      }).eq('id', linkId)
      fetchAll()
    } catch {}
  }

  const handlePlayerSlotsUpdate = (slots: SpellSlots) => {
    setCharacter(prev => prev ? { ...prev, spell_slots: slots } as any : prev)
  }

  if (!user || loading) return null

  const playerSlots:  SpellSlots  = (character as any)?.spell_slots ?? {}
  const playerSpells: Array<{ name: string; level: number; school: string }> =
    (character?.full_data as CharacterFullData | undefined)?.spells ?? []

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Roll toast */}
      {lastRoll && (
        <RollToast roll={lastRoll} onClose={() => setLastRoll(null)} />
      )}

      <div>
        <h1 className="text-xl font-bold text-zinc-100">Charaktere</h1>
        <p className="text-sm text-zinc-400">
          {isGM ? 'Gruppenübersicht aller Charaktere' : 'Dein DnD Beyond Charakter'}
        </p>
      </div>

      {isGM ? (
        <div className="space-y-4">
          {allCharacters.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>Noch keine Charaktere verlinkt.</p>
              <p className="text-sm mt-1">Spieler können ihre Charaktere unter „Charaktere" verlinken.</p>
            </div>
          )}
          {allCharacters.map(c => (
            <GMCharacterCard
              key={c.id}
              c={c}
              onRefresh={handleRefresh}
              onSlotsUpdate={handleGMSlotsUpdate}
              onHpUpdate={handleGMHpUpdate}
              onRoll={handleRoll}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <CharacterLinkCard
            character={character}
            currentUser={user}
            onSaved={setCharacter}
          />

          {character && (
            <PlayerCharacterTabs
              linkId={character.id}
              slots={playerSlots}
              spells={playerSpells}
              onSlotsUpdate={handlePlayerSlotsUpdate}
            />
          )}
        </div>
      )}
    </div>
  )
}
