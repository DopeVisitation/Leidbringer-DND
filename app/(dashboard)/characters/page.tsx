'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CharacterLinkCard } from '@/components/characters/CharacterLink'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink, User, CharacterFullData } from '@/types'
import { Heart, Shield, Eye, Zap, ExternalLink, RefreshCw, ChevronDown, ChevronRight, Sparkles, RotateCcw, Plus, Minus } from 'lucide-react'

function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0
  if (pct > 0.6) return 'bg-emerald-500'
  if (pct > 0.3) return 'bg-yellow-500'
  return 'bg-red-500'
}

function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }

// ── Spell Slot Tracker ─────────────────────────────────────────────────────────
interface SpellSlots {
  [level: string]: { max: number; used: number }
}

const SPELL_LEVEL_LABELS: Record<string, string> = {
  '1': '1. Grad',
  '2': '2. Grad',
  '3': '3. Grad',
  '4': '4. Grad',
  '5': '5. Grad',
  '6': '6. Grad',
  '7': '7. Grad',
  '8': '8. Grad',
  '9': '9. Grad',
}

function SpellSlotTracker({
  linkId,
  slots,
  onUpdate,
  readonly = false,
}: {
  linkId: string
  slots: SpellSlots
  onUpdate: (newSlots: SpellSlots) => void
  readonly?: boolean
}) {
  const supabase = createClient()
  const [localSlots, setLocalSlots] = useState<SpellSlots>(slots)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocalSlots(slots) }, [JSON.stringify(slots)])

  const levels = Object.keys(SPELL_LEVEL_LABELS).filter(l => localSlots[l] !== undefined)

  const save = async (updated: SpellSlots) => {
    setSaving(true)
    await supabase.from('character_links').update({ spell_slots: updated }).eq('id', linkId)
    onUpdate(updated)
    setSaving(false)
  }

  const changeUsed = (level: string, delta: number) => {
    if (readonly) return
    const slot = localSlots[level]
    if (!slot) return
    const newUsed = Math.max(0, Math.min(slot.max, slot.used + delta))
    const updated = { ...localSlots, [level]: { ...slot, used: newUsed } }
    setLocalSlots(updated)
    save(updated)
  }

  const changeMax = (level: string, delta: number) => {
    const slot = localSlots[level] ?? { max: 0, used: 0 }
    const newMax = Math.max(0, slot.max + delta)
    const newUsed = Math.min(slot.used, newMax)
    const updated = { ...localSlots, [level]: { max: newMax, used: newUsed } }
    setLocalSlots(updated)
    save(updated)
  }

  const addLevel = (level: string) => {
    if (localSlots[level]) return
    const updated = { ...localSlots, [level]: { max: 1, used: 0 } }
    setLocalSlots(updated)
    save(updated)
  }

  const removeLevel = (level: string) => {
    const updated = { ...localSlots }
    delete updated[level]
    setLocalSlots(updated)
    save(updated)
  }

  const resetAll = () => {
    const updated: SpellSlots = {}
    for (const [k, v] of Object.entries(localSlots)) {
      updated[k] = { ...v, used: 0 }
    }
    setLocalSlots(updated)
    save(updated)
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-semibold">Zauberschlitze</span>
        </div>
        <div className="flex items-center gap-1">
          {!readonly && (
            <>
              <button
                onClick={resetAll}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 transition-colors"
                title="Alle Slots zurücksetzen"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button
                onClick={() => setEditMode(e => !e)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                  editMode ? 'text-amber-400 bg-amber-600/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {editMode ? 'Fertig' : 'Bearbeiten'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Slot rows */}
      {levels.length === 0 && !editMode && (
        <p className="text-xs text-zinc-600 py-2 text-center">Keine Zaubergrade konfiguriert</p>
      )}

      {levels.map(level => {
        const slot = localSlots[level]
        const pct = slot.max > 0 ? (slot.max - slot.used) / slot.max : 0
        return (
          <div key={level} className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 w-14 flex-shrink-0">{SPELL_LEVEL_LABELS[level] ?? `Grad ${level}`}</span>

            {/* Slot pips */}
            <div className="flex gap-1 flex-1">
              {Array.from({ length: slot.max }, (_, i) => (
                <button
                  key={i}
                  onClick={() => !readonly && changeUsed(level, i < (slot.max - slot.used) ? 1 : -1)}
                  title={i < (slot.max - slot.used) ? 'Slot verbrauchen' : 'Slot wiederherstellen'}
                  className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${
                    i < (slot.max - slot.used)
                      ? 'bg-purple-500 border-purple-400'
                      : 'bg-transparent border-zinc-600'
                  } ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                />
              ))}
            </div>

            {/* Count */}
            <span className="text-[11px] text-zinc-400 w-10 text-right flex-shrink-0">
              {slot.max - slot.used}/{slot.max}
            </span>

            {/* Edit controls */}
            {editMode && !readonly && (
              <div className="flex items-center gap-1">
                <button onClick={() => changeMax(level, -1)} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400">
                  <Minus className="w-3 h-3" />
                </button>
                <button onClick={() => changeMax(level, 1)} className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => removeLevel(level)} className="w-5 h-5 rounded bg-red-900/40 hover:bg-red-900/70 flex items-center justify-center text-red-400 text-[10px]">
                  ×
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add level row (edit mode) */}
      {editMode && !readonly && (
        <div className="flex flex-wrap gap-1 pt-1">
          {Object.keys(SPELL_LEVEL_LABELS).filter(l => !localSlots[l]).map(level => (
            <button
              key={level}
              onClick={() => addLevel(level)}
              className="px-2 py-0.5 rounded text-[11px] text-purple-400 bg-purple-900/20 hover:bg-purple-900/40 border border-purple-800/30 transition-colors"
            >
              + Grad {level}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── GM Character Card ──────────────────────────────────────────────────────────
function GMCharacterCard({ c, onRefresh, onSlotsUpdate }: {
  c: CharacterLink & { user: User }
  onRefresh: (id: string) => void
  onSlotsUpdate: (id: string, slots: SpellSlots) => void
}) {
  const [open, setOpen] = useState(false)
  const d: CharacterFullData | null = (c.full_data as CharacterFullData | undefined) ?? null

  const hp = d?.max_hp ?? 0
  const slots: SpellSlots = (c as any).spell_slots ?? {}

  const passivePerception = d ? 10 + (d.skills.find(s => s.key === 'perception')?.bonus ?? 0) : null
  const passiveInsight    = d ? 10 + (d.skills.find(s => s.key === 'insight')?.bonus ?? 0) : null
  const passiveInvestigation = d ? 10 + (d.skills.find(s => s.key === 'investigation')?.bonus ?? 0) : null

  const hasSpellSlots = Object.keys(slots).length > 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-base font-bold text-zinc-200 flex-shrink-0">
          {(c.user as User & { avatar_emoji?: string })?.avatar_emoji ?? c.user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500">{c.user?.username}</p>
          <p className="text-base font-bold text-zinc-100 leading-tight truncate">{c.character_name}</p>
          <p className="text-xs text-zinc-400">{c.class_name} · Stufe {c.level}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh(c.id)}
            className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
            title="Daten aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {c.dnd_beyond_url && (
            <a href={c.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="DnD Beyond">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 text-zinc-500 hover:text-zinc-300">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {d ? (
        <>
          {/* Combat stats summary */}
          <div className="px-4 py-3 space-y-2">
            {/* HP bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Heart className="w-3 h-3 text-red-400" /> HP
                </div>
                <span className="text-sm font-bold text-zinc-100">{d.max_hp} / {d.max_hp}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${hpColor(hp, hp)}`} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Shield className="w-3 h-3 text-zinc-400" />
                </div>
                <p className="text-lg font-black text-zinc-100">{d.armor_class}</p>
                <p className="text-[10px] text-zinc-500">RK</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-amber-400">{modSign(d.initiative)}</p>
                <p className="text-[10px] text-zinc-500">Init</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">{d.speed}</p>
                <p className="text-[10px] text-zinc-500">Tempo</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">{modSign(d.proficiency_bonus)}</p>
                <p className="text-[10px] text-zinc-500">Prof</p>
              </div>
            </div>

            {/* Passive values */}
            {(passivePerception !== null) && (
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs">
                  <Eye className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-400">Wahrnehmung</span>
                  <span className="font-bold text-zinc-100">{passivePerception}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400">Einsicht</span>
                  <span className="font-bold text-zinc-100">{passiveInsight}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400">Nachforschung</span>
                  <span className="font-bold text-zinc-100">{passiveInvestigation}</span>
                </div>
              </div>
            )}

            {/* Spell Slot Tracker (GM view = read-only) */}
            {hasSpellSlots && (
              <div className="pt-1 border-t border-zinc-800/60">
                <SpellSlotTracker
                  linkId={c.id}
                  slots={slots}
                  onUpdate={(s) => onSlotsUpdate(c.id, s)}
                  readonly={true}
                />
              </div>
            )}
          </div>

          {/* Expanded: full stats */}
          {open && (
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
              {/* Ability scores */}
              <div>
                <p className="text-xs text-zinc-500 font-semibold mb-2">Attribute</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {['STR','DEX','CON','INT','WIS','CHA'].map(ab => (
                    <div key={ab} className="text-center bg-zinc-800/60 rounded-lg py-1.5">
                      <p className="text-[10px] text-zinc-500">{ab}</p>
                      <p className="text-xs font-bold text-zinc-100">{modSign(Math.floor(((d.stats[ab] ?? 10) - 10) / 2))}</p>
                      <p className="text-[10px] text-zinc-600">{d.stats[ab]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saves */}
              <div>
                <p className="text-xs text-zinc-500 font-semibold mb-2">Rettungswürfe</p>
                <div className="flex flex-wrap gap-1.5">
                  {(d.saves ?? []).map(s => (
                    <span key={s.ability} className={`text-xs px-2 py-0.5 rounded border ${
                      s.proficient ? 'bg-amber-900/30 border-amber-700/40 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}>
                      {s.proficient && '● '}{s.ability} {modSign(s.bonus)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weapons */}
              {(d.weapons ?? []).filter(w => w.equipped).length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-semibold mb-2">Ausgerüstete Waffen</p>
                  <div className="space-y-1">
                    {d.weapons.filter(w => w.equipped).map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400">⚔</span>
                        <span className="text-zinc-200 flex-1">{w.name}</span>
                        <span className="text-zinc-400">Atk {modSign(w.attackBonus)}</span>
                        <span className="text-zinc-400">{w.damage}{w.damageBonus !== 0 ? modSign(w.damageBonus) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-500">Keine Charakterdaten geladen. Spieler muss den Charakter verlinken und Daten synchronisieren.</p>
        </div>
      )}
    </div>
  )
}

// ── Player Spell Slot Card ─────────────────────────────────────────────────────
function PlayerSpellSlotCard({ linkId, slots, onUpdate }: {
  linkId: string
  slots: SpellSlots
  onUpdate: (s: SpellSlots) => void
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
      <SpellSlotTracker
        linkId={linkId}
        slots={slots}
        onUpdate={onUpdate}
        readonly={false}
      />
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CharactersPage() {
  const { user, isGM } = useAuth()
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [allCharacters, setAllCharacters] = useState<(CharacterLink & { user: User })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
  }, [user, isGM, supabase])

  useEffect(() => {
    if (!user) return
    fetchAll()
  }, [user, fetchAll])

  const handleRefresh = async (linkId: string) => {
    const link = allCharacters.find(c => c.id === linkId)
    if (!link) return
    try {
      const res = await fetch(`/api/dnd-character?url=${encodeURIComponent(link.dnd_beyond_url)}`)
      if (!res.ok) return
      const data = await res.json()
      await supabase.from('character_links').update({
        full_data: data,
        character_name: data.character_name,
        class_name: data.class_name,
        level: data.level,
        updated_at: new Date().toISOString(),
      }).eq('id', linkId)
      fetchAll()
    } catch {}
  }

  const handleGMSlotsUpdate = (linkId: string, slots: SpellSlots) => {
    setAllCharacters(prev => prev.map(c => c.id === linkId ? { ...c, spell_slots: slots } as any : c))
  }

  const handlePlayerSlotsUpdate = (slots: SpellSlots) => {
    setCharacter(prev => prev ? { ...prev, spell_slots: slots } as any : prev)
  }

  if (!user || loading) return null

  const playerSlots: SpellSlots = (character as any)?.spell_slots ?? {}

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
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
          {allCharacters.map((c) => (
            <GMCharacterCard
              key={c.id}
              c={c}
              onRefresh={handleRefresh}
              onSlotsUpdate={handleGMSlotsUpdate}
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

          {/* Spell Slot Tracker for player */}
          {character && (
            <PlayerSpellSlotCard
              linkId={character.id}
              slots={playerSlots}
              onUpdate={handlePlayerSlotsUpdate}
            />
          )}
        </div>
      )}
    </div>
  )
}
