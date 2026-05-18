'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CharacterLinkCard } from '@/components/characters/CharacterLink'
import { MiniDicePanel } from '@/components/shared/MiniDicePanel'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink, User, CharacterFullData } from '@/types'
import {
  Heart, Shield, Eye, ExternalLink, RefreshCw,
  ChevronDown, ChevronRight, Sparkles, RotateCcw, Plus, Minus,
  BookOpen, Swords, Star, Zap,
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

// ── Roll Bonus ─────────────────────────────────────────────────────────────────
interface RollBonus {
  id: string
  label: string
  bonus: number
  note?: string
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

// ── Class Resources ────────────────────────────────────────────────────────────
interface ClassResource {
  label: string
  max: number
  used: number
  reset_on: 'long_rest' | 'short_rest' | 'dawn'
}
interface ClassResources {
  [key: string]: ClassResource
}

const RESET_LABELS: Record<string, string> = {
  long_rest:  'Lange Rast',
  short_rest: 'Kurze Rast',
  dawn:       'Morgengrauen',
}

const CLASS_RESOURCES: Record<string, Array<{ key: string; label: string; max: number; reset_on: 'long_rest' | 'short_rest' | 'dawn' }>> = {
  'barbar':     [{ key: 'rage', label: 'Wut', max: 2, reset_on: 'long_rest' }],
  'barbarian':  [{ key: 'rage', label: 'Wut', max: 2, reset_on: 'long_rest' }],
  'barde':      [{ key: 'bardic_inspiration', label: 'Bardische Inspiration', max: 3, reset_on: 'long_rest' }],
  'bard':       [{ key: 'bardic_inspiration', label: 'Bardische Inspiration', max: 3, reset_on: 'long_rest' }],
  'kleriker':   [{ key: 'channel_divinity', label: 'Göttlicher Kanal', max: 1, reset_on: 'short_rest' }],
  'cleric':     [{ key: 'channel_divinity', label: 'Göttlicher Kanal', max: 1, reset_on: 'short_rest' }],
  'druide':     [{ key: 'wild_shape', label: 'Wildgestalt', max: 2, reset_on: 'short_rest' }],
  'druid':      [{ key: 'wild_shape', label: 'Wildgestalt', max: 2, reset_on: 'short_rest' }],
  'kämpfer':    [{ key: 'action_surge', label: 'Kampfentschlossenheit', max: 1, reset_on: 'short_rest' }, { key: 'second_wind', label: 'Zweiter Atem', max: 1, reset_on: 'short_rest' }],
  'fighter':    [{ key: 'action_surge', label: 'Kampfentschlossenheit', max: 1, reset_on: 'short_rest' }, { key: 'second_wind', label: 'Zweiter Atem', max: 1, reset_on: 'short_rest' }],
  'mönch':      [{ key: 'ki_points', label: 'Ki-Punkte', max: 4, reset_on: 'short_rest' }],
  'monk':       [{ key: 'ki_points', label: 'Ki-Punkte', max: 4, reset_on: 'short_rest' }],
  'paladin':    [{ key: 'channel_divinity', label: 'Göttlicher Kanal', max: 1, reset_on: 'short_rest' }, { key: 'lay_on_hands', label: 'Handauflegen', max: 25, reset_on: 'long_rest' }],
  'zauberer':   [{ key: 'sorcery_points', label: 'Zauberpunkte', max: 3, reset_on: 'long_rest' }],
  'sorcerer':   [{ key: 'sorcery_points', label: 'Zauberpunkte', max: 3, reset_on: 'long_rest' }],
}

function getDefaultResources(className: string | null | undefined): ClassResources {
  if (!className) return {}
  const key = className.toLowerCase().trim()
  // Try exact match, then partial
  const defs = CLASS_RESOURCES[key] ??
    Object.entries(CLASS_RESOURCES).find(([k]) => key.includes(k))?.[1] ?? null
  if (!defs) return {}
  const out: ClassResources = {}
  for (const d of defs) {
    out[d.key] = { label: d.label, max: d.max, used: 0, reset_on: d.reset_on }
  }
  return out
}

function ClassResourcesTracker({
  linkId, resources, className, onUpdate, readonly = false,
}: {
  linkId: string
  resources: ClassResources
  className?: string | null
  onUpdate: (r: ClassResources) => void
  readonly?: boolean
}) {
  const supabase = createClient()
  const [local, setLocal] = useState<ClassResources>(resources)
  const [editMode, setEditMode] = useState(false)
  const [open, setOpen] = useState(!readonly)

  useEffect(() => { setLocal(resources) }, [JSON.stringify(resources)]) // eslint-disable-line react-hooks/exhaustive-deps

  const keys = Object.keys(local)

  const save = async (updated: ClassResources) => {
    await supabase.from('character_links').update({ class_resources: updated }).eq('id', linkId)
    onUpdate(updated)
  }

  const togglePip = (key: string, pipIndex: number) => {
    if (readonly) return
    const res = local[key]; if (!res) return
    // Pips fill left to right. Available pips = max - used (filled), used = empty pips on right.
    // Click fills (use) or empties (restore). pipIndex < available → use; else → restore
    const available = res.max - res.used
    const newUsed = pipIndex < available ? res.used + 1 : res.used - 1
    const updated = { ...local, [key]: { ...res, used: Math.max(0, Math.min(res.max, newUsed)) } }
    setLocal(updated); save(updated)
  }

  const resetAll = () => {
    if (readonly) return
    const updated: ClassResources = {}
    for (const [k, v] of Object.entries(local)) updated[k] = { ...v, used: 0 }
    setLocal(updated); save(updated)
  }

  const changeMax = (key: string, delta: number) => {
    const res = local[key]; if (!res) return
    const newMax = Math.max(0, res.max + delta)
    const updated = { ...local, [key]: { ...res, max: newMax, used: Math.min(res.used, newMax) } }
    setLocal(updated); save(updated)
  }

  const removeResource = (key: string) => {
    const updated = { ...local }; delete updated[key]
    setLocal(updated); save(updated)
  }

  const addResource = () => {
    const key = `resource_${Date.now()}`
    const updated = { ...local, [key]: { label: 'Neue Ressource', max: 1, used: 0, reset_on: 'long_rest' as const } }
    setLocal(updated); save(updated)
  }

  const updateLabel = (key: string, label: string) => {
    const res = local[key]; if (!res) return
    const updated = { ...local, [key]: { ...res, label } }
    setLocal(updated); save(updated)
  }

  const updateResetOn = (key: string, reset_on: ClassResource['reset_on']) => {
    const res = local[key]; if (!res) return
    const updated = { ...local, [key]: { ...res, reset_on } }
    setLocal(updated); save(updated)
  }

  // For GM view: collapsible
  if (readonly) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-zinc-400">Klassen-Ressourcen</span>
          {keys.length === 0 && <span className="text-[11px] text-zinc-600 ml-1">(keine)</span>}
        </button>
        {open && keys.length > 0 && (
          <div className="space-y-1.5 pl-5">
            {keys.map(key => {
              const res = local[key]
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 flex-1 truncate">{res.label}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: res.max }, (_, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        i < res.max - res.used ? 'bg-amber-500 border-amber-400' : 'bg-transparent border-zinc-600'
                      }`} />
                    ))}
                  </div>
                  <span className="text-[11px] text-zinc-500 w-8 text-right">{res.max - res.used}/{res.max}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold">Klassen-Ressourcen</span>
        </div>
        <div className="flex items-center gap-1">
          {keys.length > 0 && (
            <button onClick={resetAll} className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 transition-colors" title="Alle zurücksetzen">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
          <button onClick={() => setEditMode(e => !e)} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${editMode ? 'text-amber-400 bg-amber-600/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
            {editMode ? 'Fertig' : 'Bearbeiten'}
          </button>
        </div>
      </div>

      {keys.length === 0 && !editMode && (
        <p className="text-xs text-zinc-600 py-2 text-center">Keine Klassen-Ressourcen konfiguriert</p>
      )}

      {keys.map(key => {
        const res = local[key]
        const available = res.max - res.used
        return (
          <div key={key} className={`space-y-1 ${editMode ? 'bg-zinc-800/40 rounded-lg p-2' : ''}`}>
            <div className="flex items-center gap-2">
              {editMode ? (
                <input
                  value={res.label}
                  onChange={e => updateLabel(key, e.target.value)}
                  className="text-[11px] text-zinc-200 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 flex-1 focus:outline-none focus:border-amber-500"
                />
              ) : (
                <span className="text-[11px] text-zinc-400 flex-1 truncate">{res.label}</span>
              )}
              <div className="flex gap-1">
                {Array.from({ length: res.max }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => togglePip(key, i)}
                    title={i < available ? 'Verbrauchen' : 'Wiederherstellen'}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 cursor-pointer hover:scale-110 ${
                      i < available ? 'bg-amber-500 border-amber-400' : 'bg-transparent border-zinc-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-zinc-400 w-10 text-right flex-shrink-0">{available}/{res.max}</span>
              {editMode && (
                <div className="flex items-center gap-1">
                  <button onClick={() => changeMax(key, -1)} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"><Minus className="w-3 h-3" /></button>
                  <button onClick={() => changeMax(key, 1)}  className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400"><Plus  className="w-3 h-3" /></button>
                  <button onClick={() => removeResource(key)} className="w-5 h-5 rounded bg-red-900/40 hover:bg-red-900/70 flex items-center justify-center text-red-400 text-[10px]">×</button>
                </div>
              )}
            </div>
            {editMode && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-zinc-600">Reset bei:</span>
                {(['long_rest', 'short_rest', 'dawn'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => updateResetOn(key, r)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      res.reset_on === r
                        ? 'bg-amber-600/20 border-amber-600/50 text-amber-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {RESET_LABELS[r]}
                  </button>
                ))}
              </div>
            )}
            {!editMode && (
              <p className="text-[10px] text-zinc-600">Reset: {RESET_LABELS[res.reset_on]}</p>
            )}
          </div>
        )
      })}

      {editMode && (
        <button
          onClick={addResource}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-amber-400 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20 transition-colors"
        >
          <Plus className="w-3 h-3" /> Ressource hinzufügen
        </button>
      )}
    </div>
  )
}

// ── Roll Bonuses Section ───────────────────────────────────────────────────────
function RollBonusesSection({
  linkId, bonuses, readonly = false,
}: {
  linkId: string
  bonuses: RollBonus[]
  readonly?: boolean
}) {
  const supabase = createClient()
  const [local, setLocal] = useState<RollBonus[]>(bonuses)
  const [editMode, setEditMode] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newBonus, setNewBonus] = useState(0)
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { setLocal(bonuses) }, [JSON.stringify(bonuses)]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (updated: RollBonus[]) => {
    setLocal(updated)
    await supabase.from('character_links').update({ roll_bonuses: updated }).eq('id', linkId)
  }

  const addBonus = async () => {
    if (!newLabel.trim()) return
    const updated = [...local, { id: crypto.randomUUID(), label: newLabel.trim(), bonus: newBonus, note: newNote.trim() || undefined }]
    await save(updated)
    setNewLabel(''); setNewBonus(0); setNewNote(''); setAdding(false)
  }

  const removeBonus = async (id: string) => {
    await save(local.filter(b => b.id !== id))
  }

  const updateBonus = async (id: string, patch: Partial<RollBonus>) => {
    await save(local.map(b => b.id === id ? { ...b, ...patch } : b))
  }

  if (local.length === 0 && readonly && !editMode) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Star className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">Würfelboni</span>
        </div>
        {!readonly && (
          <button
            onClick={() => setEditMode(e => !e)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${editMode ? 'text-amber-400 bg-amber-600/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
          >
            {editMode ? 'Fertig' : 'Bearbeiten'}
          </button>
        )}
      </div>

      {local.length === 0 && !editMode && (
        <p className="text-xs text-zinc-600 py-1">Keine Würfelboni</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {local.map(rb => (
          <div key={rb.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
            rb.bonus >= 0
              ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
              : 'bg-red-900/30 border-red-700/50 text-red-300'
          }`}>
            {editMode ? (
              <>
                <input
                  value={rb.label}
                  onChange={e => updateBonus(rb.id, { label: e.target.value })}
                  className="bg-transparent border-none outline-none w-20 text-[11px]"
                />
                <input
                  type="number"
                  value={rb.bonus}
                  onChange={e => updateBonus(rb.id, { bonus: parseInt(e.target.value) || 0 })}
                  className="bg-transparent border-none outline-none w-8 text-[11px] text-center"
                />
                <button onClick={() => removeBonus(rb.id)} className="text-red-400 hover:text-red-300 ml-1">×</button>
              </>
            ) : (
              <span title={rb.note}>{rb.label}: {rb.bonus >= 0 ? `+${rb.bonus}` : rb.bonus}</span>
            )}
          </div>
        ))}
      </div>

      {editMode && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-emerald-400 bg-emerald-900/10 hover:bg-emerald-900/20 border border-emerald-700/20 transition-colors"
        >
          <Plus className="w-3 h-3" /> Bonus hinzufügen
        </button>
      )}

      {adding && (
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/40">
          <input
            autoFocus
            placeholder="z.B. Weisheit"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="flex-1 min-w-[100px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="number"
            value={newBonus}
            onChange={e => setNewBonus(parseInt(e.target.value) || 0)}
            className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-emerald-500"
          />
          <input
            placeholder="Notiz (opt.)"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            className="flex-1 min-w-[80px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={addBonus}
            disabled={!newLabel.trim()}
            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-[11px] text-white font-semibold"
          >
            +
          </button>
          <button
            onClick={() => { setAdding(false); setNewLabel(''); setNewBonus(0); setNewNote('') }}
            className="px-2 py-1 rounded bg-zinc-700 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── GM Character Card ──────────────────────────────────────────────────────────
function GMCharacterCard({ c, onRefresh, onSlotsUpdate, onHpUpdate, onResourcesUpdate, onRoll }: {
  c: CharacterLink & { user: User }
  onRefresh: (id: string) => void
  onSlotsUpdate: (id: string, slots: SpellSlots) => void
  onHpUpdate: (id: string, hp: number) => void
  onResourcesUpdate: (id: string, resources: ClassResources) => void
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

  // Class resources
  const rawResources: ClassResources = (c as any).class_resources ?? {}
  const [localResources, setLocalResources] = useState<ClassResources>(rawResources)

  useEffect(() => {
    setLocalResources((c as any).class_resources ?? {})
  }, [(c as any).class_resources]) // eslint-disable-line react-hooks/exhaustive-deps

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

            {/* Class Resources (read-only for GM) */}
            <div className="pt-1 border-t border-zinc-800/60">
              <ClassResourcesTracker
                linkId={c.id}
                resources={localResources}
                className={c.class_name}
                onUpdate={(r) => { setLocalResources(r); onResourcesUpdate(c.id, r) }}
                readonly={true}
              />
            </div>

            {/* Roll Bonuses (editable for GM) */}
            <div className="pt-1 border-t border-zinc-800/60">
              <RollBonusesSection
                linkId={c.id}
                bonuses={(c as any).roll_bonuses ?? []}
                readonly={false}
              />
            </div>
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
  linkId, slots, spells, resources, rollBonuses, className, onSlotsUpdate, onResourcesUpdate,
}: {
  linkId: string
  slots: SpellSlots
  spells: Array<{ name: string; level: number; school: string }>
  resources: ClassResources
  rollBonuses: RollBonus[]
  className?: string | null
  onSlotsUpdate: (s: SpellSlots) => void
  onResourcesUpdate: (r: ClassResources) => void
}) {
  const hasSpells = spells.length > 0
  const [tab, setTab] = useState<'schlitze' | 'zauber'>('schlitze')

  const tabs = [
    { id: 'schlitze', label: 'Zauberschlitze', icon: Sparkles },
    ...(hasSpells ? [{ id: 'zauber', label: 'Zauber', icon: BookOpen }] : []),
  ] as const

  return (
    <>
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

      {/* Class Resources card below spell slots */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <ClassResourcesTracker
          linkId={linkId}
          resources={resources}
          className={className}
          onUpdate={onResourcesUpdate}
          readonly={false}
        />
      </div>

      {/* Roll Bonuses */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <RollBonusesSection
          linkId={linkId}
          bonuses={rollBonuses}
          readonly={false}
        />
      </div>
    </>
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

  // Auto-populate class resources if empty
  useEffect(() => {
    if (!character) return
    const existing: ClassResources = (character as any).class_resources ?? {}
    if (Object.keys(existing).length > 0) return
    const defaults = getDefaultResources(character.class_name)
    if (Object.keys(defaults).length === 0) return
    // Save defaults
    supabase.from('character_links').update({ class_resources: defaults }).eq('id', character.id)
    setCharacter(prev => prev ? { ...prev, class_resources: defaults } as any : prev)
  }, [character?.id, character?.class_name]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleGMResourcesUpdate = (linkId: string, resources: ClassResources) => {
    setAllCharacters(prev => prev.map(c => c.id === linkId ? { ...c, class_resources: resources } as any : c))
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

  const handlePlayerResourcesUpdate = (resources: ClassResources) => {
    setCharacter(prev => prev ? { ...prev, class_resources: resources } as any : prev)
  }

  if (!user || loading) return null

  const playerSlots:     SpellSlots   = (character as any)?.spell_slots ?? {}
  const playerSpells: Array<{ name: string; level: number; school: string }> =
    (character?.full_data as CharacterFullData | undefined)?.spells ?? []
  const playerResources: ClassResources = (character as any)?.class_resources ?? {}
  const playerRollBonuses: RollBonus[] = (character as any)?.roll_bonuses ?? []

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

      {/* Mini Dice Panel — accessible to everyone */}
      <MiniDicePanel title="🎲 Würfelwurf" />

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
              onResourcesUpdate={handleGMResourcesUpdate}
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
              resources={playerResources}
              rollBonuses={playerRollBonuses}
              className={character.class_name}
              onSlotsUpdate={handlePlayerSlotsUpdate}
              onResourcesUpdate={handlePlayerResourcesUpdate}
            />
          )}
        </div>
      )}
    </div>
  )
}
