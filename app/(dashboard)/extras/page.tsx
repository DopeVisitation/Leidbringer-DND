'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, Pencil, Trash2, PawPrint, Heart, Shield, Zap, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { MiniDicePanel } from '@/components/shared/MiniDicePanel'

type CompanionType = 'pet' | 'summon' | 'familiar' | 'npc' | 'mount'

interface DiceConfig { type: string; count: number; damageType?: string }

// "Aktionen" section — matches token's FavoriteAction exactly (+ id + notes)
interface CompanionAction {
  id: string
  name: string
  attack_bonus: number
  damage_bonus: number
  dice_config: DiceConfig[]
  notes: string
  charges_max?: number   // 0 oder undefined = keine Ladungen
  charges_used?: number
}

// "Fähigkeiten" section — spells/abilities with charges
interface Ability {
  id: string
  name: string
  description: string
  charges_max: number
  charges_used: number
  dice_config: DiceConfig[]
  damage_bonus: number
  save_type: string
  save_dc: number
}

interface CompanionCharacter {
  id: string
  name: string
  type: CompanionType
  image_url: string | null
  max_hp: number | null
  current_hp: number | null
  armor_class: number | null
  speed: number | null
  str: number | null; dex: number | null; con: number | null
  int: number | null; wis: number | null; cha: number | null
  notes: string | null
  owner_id: string | null
  created_by: string | null
  favorite_dice: CompanionAction[]
  bonus_actions: CompanionAction[]
  abilities: Ability[]
}

const TYPE_CONFIG: Record<CompanionType, { label: string; color: string; bg: string; icon: string }> = {
  pet:      { label: 'Begleiter',   color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/50', icon: '🐾' },
  summon:   { label: 'Beschwörung', color: 'text-purple-400',  bg: 'bg-purple-900/20 border-purple-800/50',   icon: '✨' },
  familiar: { label: 'Vertrauter',  color: 'text-blue-400',    bg: 'bg-blue-900/20 border-blue-800/50',       icon: '🦉' },
  npc:      { label: 'NPC',         color: 'text-amber-400',   bg: 'bg-amber-900/20 border-amber-800/50',     icon: '🧙' },
  mount:    { label: 'Reittier',    color: 'text-orange-400',  bg: 'bg-orange-900/20 border-orange-800/50',   icon: '🐴' },
}

const STAT_ABBR = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
const SAVE_TYPES = ['', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const
const DICE_TYPES = ['d4','d6','d8','d10','d12','d20'] as const
const DAMAGE_TYPES = ['', 'Hieb', 'Stich', 'Wucht', 'Feuer', 'Kälte', 'Blitz', 'Säure', 'Gift', 'Nekrose', 'Strahlend', 'Kraft', 'Psychisch', 'Donner'] as const

function statMod(v: number | null) {
  if (v == null) return null
  const m = Math.floor((v - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

const EMPTY_FORM = {
  name: '',
  type: 'pet' as CompanionType,
  image_url: '',
  max_hp: '',
  current_hp: '',
  armor_class: '',
  speed: '',
  str: '', dex: '', con: '', int: '', wis: '', cha: '',
  notes: '',
}

type FormState = typeof EMPTY_FORM

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const color = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function NoteAppendSection({ c, onAppend }: { c: CompanionCharacter; onAppend: (c: CompanionCharacter, text: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    await onAppend(c, text)
    setText('')
    setOpen(false)
    setSaving(false)
  }

  return (
    <div className="pt-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] text-zinc-600 hover:text-zinc-400 underline"
        >
          + Notiz
        </button>
      ) : (
        <div className="space-y-1.5 bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/40">
          <textarea
            rows={2}
            autoFocus
            placeholder="Notiz eingeben…"
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              disabled={saving || !text.trim()}
              className="flex-1 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-[10px] font-semibold text-white"
            >
              Eintrag hinzufügen
            </button>
            <button
              onClick={() => { setOpen(false); setText('') }}
              className="px-2 py-1 rounded border border-zinc-700 text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Abbruch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CompanionCard({
  c, isGM, userId, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId,
  onApplyHp, onUseAbility, onDeploy, onRest, onRollAction, onRollAbility, onAppendNote,
  onUseAction, onRestoreAction,
}: {
  c: CompanionCharacter
  isGM: boolean
  userId: string
  onEdit: (c: CompanionCharacter) => void
  onDelete: (id: string) => void
  deleteConfirmId: string | null
  setDeleteConfirmId: (id: string | null) => void
  onApplyHp: (c: CompanionCharacter, delta: number) => void
  onUseAbility: (c: CompanionCharacter, abilityId: string) => void
  onDeploy: (c: CompanionCharacter) => void
  onRest: (c: CompanionCharacter) => void
  onRollAction: (c: CompanionCharacter, action: CompanionAction, rollType: 'attack' | 'damage') => void
  onRollAbility: (c: CompanionCharacter, ability: Ability) => void
  onAppendNote: (c: CompanionCharacter, text: string) => Promise<void>
  onUseAction: (c: CompanionCharacter, actionId: string, isBonus: boolean) => void
  onRestoreAction: (c: CompanionCharacter, actionId: string, isBonus: boolean) => void
}) {
  const cfg = TYPE_CONFIG[c.type] ?? TYPE_CONFIG.npc
  const canEdit = isGM || c.created_by === userId
  const maxHp = c.max_hp ?? 0
  const curHp = c.current_hp ?? maxHp

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col hover:border-zinc-700 transition-colors">
      {/* Image */}
      {c.image_url ? (
        <div className="aspect-video bg-zinc-800 overflow-hidden">
          <img
            src={c.image_url}
            alt={c.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      ) : (
        <div className="aspect-video bg-zinc-800/50 flex items-center justify-center">
          <span className="text-4xl">{cfg.icon}</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Name + type */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-zinc-100 truncate">{c.name}</h3>
            <span className={`inline-block text-[11px] font-semibold mt-1 px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onRest(c)}
                className="p-1.5 rounded text-zinc-600 hover:text-blue-400 hover:bg-zinc-700 transition-colors"
                title="Lange Rast — HP + Ladungen vollständig auffüllen"
              >
                🌙
              </button>
              {isGM && (
                <button
                  onClick={() => onDeploy(c)}
                  className="p-1.5 rounded text-zinc-600 hover:text-amber-400 hover:bg-zinc-700 transition-colors"
                  title="Auf Spielfeld bereitstellen"
                >
                  <Swords className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onEdit(c)}
                className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Bearbeiten"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (deleteConfirmId !== c.id) { setDeleteConfirmId(c.id); return }
                  onDelete(c.id)
                }}
                className={`p-1.5 rounded transition-colors ${
                  deleteConfirmId === c.id
                    ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40'
                    : 'text-zinc-600 hover:text-red-400 hover:bg-zinc-700'
                }`}
                title={deleteConfirmId === c.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* HP with +/- */}
        {c.max_hp != null && (
          <div>
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-xs text-zinc-400 flex-1">
                <span className="font-bold text-zinc-200">{curHp}</span>
                <span className="text-zinc-600"> / {maxHp}</span> HP
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onApplyHp(c, -1)}
                  className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center"
                >−</button>
                <button
                  onClick={() => onApplyHp(c, 1)}
                  className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex items-center justify-center"
                >+</button>
              </div>
            </div>
            <HpBar current={curHp} max={maxHp} />
          </div>
        )}

        {/* Combat stats */}
        <div className="flex gap-3 flex-wrap text-xs">
          {c.armor_class != null && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Shield className="w-3 h-3 text-zinc-400" />
              <span className="font-semibold text-zinc-200">{c.armor_class}</span> RK
            </div>
          )}
          {c.speed != null && (
            <div className="flex items-center gap-1 text-zinc-400">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="font-semibold text-zinc-200">{c.speed}</span> ft
            </div>
          )}
        </div>

        {/* Ability scores */}
        {STAT_KEYS.some(k => c[k] != null) && (
          <div className="grid grid-cols-6 gap-1">
            {STAT_KEYS.map((k, i) => (
              <div key={k} className="text-center bg-zinc-800/60 rounded-lg py-1.5">
                <p className="text-[9px] text-zinc-500">{STAT_ABBR[i]}</p>
                <p className="text-xs font-bold text-zinc-100">{statMod(c[k]) ?? '—'}</p>
                <p className="text-[9px] text-zinc-600">{c[k] ?? '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Aktionen */}
        {c.favorite_dice && c.favorite_dice.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-zinc-800">
            <p className="text-[10px] uppercase font-semibold text-zinc-600">Aktionen</p>
            {(c.favorite_dice as CompanionAction[]).map(a => {
              const hasCharges = (a.charges_max ?? 0) > 0
              const chargesUsed = a.charges_used ?? 0
              const exhausted = hasCharges && chargesUsed >= (a.charges_max ?? 0)
              return (
                <div key={a.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${exhausted ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60' : 'bg-sky-950/20 border-sky-900/40'}`}>
                  <span className="flex-1 text-xs text-zinc-200 truncate">{a.name}</span>
                  {hasCharges && (
                    <span className="flex gap-0.5">
                      {Array.from({ length: a.charges_max! }).map((_, i) => (
                        <span key={i} className={i < chargesUsed ? 'text-zinc-600' : 'text-sky-400'}>
                          {i < chargesUsed ? '○' : '●'}
                        </span>
                      ))}
                    </span>
                  )}
                  {hasCharges && (
                    <>
                      <button onClick={() => onUseAction(c, a.id, false)}
                        disabled={exhausted}
                        className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-red-300 disabled:opacity-40 flex items-center justify-center">−</button>
                      <button onClick={() => onRestoreAction(c, a.id, false)}
                        disabled={chargesUsed <= 0}
                        className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-emerald-300 disabled:opacity-40 flex items-center justify-center">+</button>
                    </>
                  )}
                  <button onClick={() => onRollAction(c, a, 'attack')}
                    className="px-1.5 py-0.5 rounded bg-amber-900/30 border border-amber-700/50 text-[10px] text-amber-200 hover:bg-amber-900/50">
                    Atk {a.attack_bonus >= 0 ? '+' : ''}{a.attack_bonus}
                  </button>
                  {(a.dice_config ?? []).length > 0 && (
                    <button onClick={() => onRollAction(c, a, 'damage')}
                      className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">
                      Dmg
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Bonus Aktionen */}
        {c.bonus_actions && c.bonus_actions.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-zinc-800">
            <p className="text-[10px] uppercase font-semibold text-zinc-600">Bonus-Aktionen</p>
            {(c.bonus_actions as CompanionAction[]).map(a => {
              const hasCharges = (a.charges_max ?? 0) > 0
              const chargesUsed = a.charges_used ?? 0
              const exhausted = hasCharges && chargesUsed >= (a.charges_max ?? 0)
              return (
                <div key={a.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${exhausted ? 'bg-zinc-900/40 border-zinc-800/60 opacity-60' : 'bg-teal-950/20 border-teal-900/40'}`}>
                  <span className="flex-1 text-xs text-zinc-200 truncate">{a.name}</span>
                  {hasCharges && (
                    <span className="flex gap-0.5">
                      {Array.from({ length: a.charges_max! }).map((_, i) => (
                        <span key={i} className={i < chargesUsed ? 'text-zinc-600' : 'text-teal-400'}>
                          {i < chargesUsed ? '○' : '●'}
                        </span>
                      ))}
                    </span>
                  )}
                  {hasCharges && (
                    <>
                      <button onClick={() => onUseAction(c, a.id, true)}
                        disabled={exhausted}
                        className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-red-300 disabled:opacity-40 flex items-center justify-center">−</button>
                      <button onClick={() => onRestoreAction(c, a.id, true)}
                        disabled={chargesUsed <= 0}
                        className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400 hover:text-emerald-300 disabled:opacity-40 flex items-center justify-center">+</button>
                    </>
                  )}
                  <button onClick={() => onRollAction(c, a, 'attack')}
                    className="px-1.5 py-0.5 rounded bg-teal-900/30 border border-teal-700/50 text-[10px] text-teal-200 hover:bg-teal-900/50">
                    Atk {a.attack_bonus >= 0 ? '+' : ''}{a.attack_bonus}
                  </button>
                  {(a.dice_config ?? []).length > 0 && (
                    <button onClick={() => onRollAction(c, a, 'damage')}
                      className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50">
                      Dmg
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Fähigkeiten */}
        {c.abilities && c.abilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
            <p className="w-full text-[10px] uppercase font-semibold text-zinc-600">Fähigkeiten</p>
            {c.abilities.map((a) => {
              const hasCharges = a.charges_max > 0
              const exhausted = hasCharges && a.charges_used >= a.charges_max
              const hasDice = a.dice_config && a.dice_config.length > 0
              return (
                <div key={a.id} className="flex items-center gap-1">
                  <button
                    onClick={() => !exhausted && onUseAbility(c, a.id)}
                    disabled={exhausted}
                    title={a.description || a.name}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                      exhausted
                        ? 'border-zinc-700 text-zinc-600 bg-zinc-800/40 cursor-not-allowed'
                        : 'border-amber-700/60 text-amber-300 bg-amber-950/30 hover:bg-amber-950/60'
                    }`}
                  >
                    <span>{a.name}</span>
                    {hasCharges && (
                      <span className="flex gap-0.5 ml-0.5">
                        {Array.from({ length: a.charges_max }).map((_, i) => (
                          <span key={i} className={i < a.charges_used ? 'text-zinc-600' : 'text-amber-400'}>
                            {i < a.charges_used ? '○' : '●'}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                  {hasDice && !exhausted && (
                    <button
                      onClick={() => onRollAbility(c, a)}
                      className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/50 text-[10px] text-red-300 hover:bg-red-900/50"
                    >
                      🎲
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <div className="max-h-40 overflow-y-auto pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-400 whitespace-pre-wrap">{c.notes}</p>
          </div>
        )}

        {/* Note append */}
        <NoteAppendSection c={c} onAppend={onAppendNote} />
      </div>
    </div>
  )
}

// Dice row sub-component for actions and abilities
function DiceRow({ dc, onChange, onRemove }: {
  dc: DiceConfig
  onChange: (dc: DiceConfig) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={20}
        value={dc.count}
        onChange={e => onChange({ ...dc, count: parseInt(e.target.value) || 1 })}
        className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500"
      />
      <select
        value={dc.type}
        onChange={e => onChange({ ...dc, type: e.target.value })}
        className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
      >
        {DICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        value={dc.damageType ?? ''}
        onChange={e => onChange({ ...dc, damageType: e.target.value || undefined })}
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
      >
        {DAMAGE_TYPES.map(d => <option key={d} value={d}>{d || '—'}</option>)}
      </select>
      <button type="button" onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 flex-shrink-0">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function CompanionForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  isEdit,
  formDice,
  setFormDice,
  formBonusActions,
  setFormBonusActions,
  formAbilities,
  setFormAbilities,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
  formDice: CompanionAction[]
  setFormDice: (d: CompanionAction[]) => void
  formBonusActions: CompanionAction[]
  setFormBonusActions: (a: CompanionAction[]) => void
  formAbilities: Ability[]
  setFormAbilities: (a: Ability[]) => void
}) {
  const numField = (key: keyof FormState) => (
    <input
      type="number"
      min={0}
      value={form[key]}
      onChange={(e) => setForm(p => ({ ...p, [key]: e.target.value }))}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
    />
  )

  // Actions (Aktionen)
  const addAction = () => {
    setFormDice([...formDice, { id: crypto.randomUUID(), name: '', attack_bonus: 0, damage_bonus: 0, dice_config: [], notes: '', charges_max: 0, charges_used: 0 }])
  }
  const removeAction = (id: string) => setFormDice(formDice.filter(a => a.id !== id))
  const updateAction = (id: string, patch: Partial<CompanionAction>) =>
    setFormDice(formDice.map(a => a.id === id ? { ...a, ...patch } : a))
  const addActionDice = (id: string) =>
    setFormDice(formDice.map(a => a.id === id ? { ...a, dice_config: [...a.dice_config, { type: 'd6', count: 1 }] } : a))
  const removeActionDice = (id: string, idx: number) =>
    setFormDice(formDice.map(a => a.id === id ? { ...a, dice_config: a.dice_config.filter((_, i) => i !== idx) } : a))
  const updateActionDice = (id: string, idx: number, dc: DiceConfig) =>
    setFormDice(formDice.map(a => a.id === id ? { ...a, dice_config: a.dice_config.map((d, i) => i === idx ? dc : d) } : a))

  // Bonus Actions (Bonus-Aktionen)
  const addBonusAction = () => {
    setFormBonusActions([...formBonusActions, { id: crypto.randomUUID(), name: '', attack_bonus: 0, damage_bonus: 0, dice_config: [], notes: '', charges_max: 0, charges_used: 0 }])
  }
  const removeBonusAction = (id: string) => setFormBonusActions(formBonusActions.filter(a => a.id !== id))
  const updateBonusAction = (id: string, patch: Partial<CompanionAction>) =>
    setFormBonusActions(formBonusActions.map(a => a.id === id ? { ...a, ...patch } : a))
  const addBonusActionDice = (id: string) =>
    setFormBonusActions(formBonusActions.map(a => a.id === id ? { ...a, dice_config: [...a.dice_config, { type: 'd6', count: 1 }] } : a))
  const removeBonusActionDice = (id: string, idx: number) =>
    setFormBonusActions(formBonusActions.map(a => a.id === id ? { ...a, dice_config: a.dice_config.filter((_, i) => i !== idx) } : a))
  const updateBonusActionDice = (id: string, idx: number, dc: DiceConfig) =>
    setFormBonusActions(formBonusActions.map(a => a.id === id ? { ...a, dice_config: a.dice_config.map((d, i) => i === idx ? dc : d) } : a))

  // Abilities (Fähigkeiten)
  const addAbility = () => {
    setFormAbilities([...formAbilities, {
      id: crypto.randomUUID(), name: '', description: '',
      charges_max: 0, charges_used: 0, dice_config: [], damage_bonus: 0, save_type: '', save_dc: 0,
    }])
  }
  const removeAbility = (id: string) => setFormAbilities(formAbilities.filter(a => a.id !== id))
  const updateAbility = (id: string, patch: Partial<Ability>) =>
    setFormAbilities(formAbilities.map(a => a.id === id ? { ...a, ...patch } : a))
  const addAbilityDice = (id: string) =>
    setFormAbilities(formAbilities.map(a => a.id === id ? { ...a, dice_config: [...a.dice_config, { type: 'd6', count: 1 }] } : a))
  const removeAbilityDice = (id: string, idx: number) =>
    setFormAbilities(formAbilities.map(a => a.id === id ? { ...a, dice_config: a.dice_config.filter((_, i) => i !== idx) } : a))
  const updateAbilityDice = (id: string, idx: number, dc: DiceConfig) =>
    setFormAbilities(formAbilities.map(a => a.id === id ? { ...a, dice_config: a.dice_config.map((d, i) => i === idx ? dc : d) } : a))

  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
        <input
          type="text"
          required
          placeholder="Name des Begleiters"
          value={form.name}
          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Typ</label>
        <select
          value={form.type}
          onChange={(e) => setForm(p => ({ ...p, type: e.target.value as CompanionType }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          {(Object.keys(TYPE_CONFIG) as CompanionType[]).map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Bild-URL</label>
        <input
          type="url"
          placeholder="https://…"
          value={form.image_url}
          onChange={(e) => setForm(p => ({ ...p, image_url: e.target.value }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* HP / AC / Speed */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max HP</label>
          {numField('max_hp')}
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rüstungsklasse</label>
          {numField('armor_class')}
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Speed (ft)</label>
          {numField('speed')}
        </div>
      </div>

      {/* Ability scores */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Attribute</label>
        <div className="grid grid-cols-6 gap-2">
          {STAT_KEYS.map((k, i) => (
            <div key={k}>
              <p className="text-[10px] text-zinc-500 text-center mb-1">{STAT_ABBR[i]}</p>
              <input
                type="number"
                min={1}
                max={30}
                value={form[k]}
                onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-1.5 py-2 text-sm text-zinc-100 text-center focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notizen */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notizen</label>
        <textarea
          rows={6}
          placeholder="Beschreibung, Hintergrund, Anmerkungen…"
          value={form.notes}
          onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-y min-h-[100px]"
        />
      </div>

      {/* Aktionen */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400">Aktionen</label>
          <button type="button" onClick={addAction}
            className="text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
            + Hinzufügen
          </button>
        </div>
        <div className="space-y-3">
          {formDice.map(a => (
            <div key={a.id} className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Name der Aktion"
                  value={a.name}
                  onChange={e => updateAction(a.id, { name: e.target.value })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button type="button" onClick={() => removeAction(a.id)}
                  className="p-1 text-zinc-600 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Angriff +</label>
                  <input
                    type="number"
                    value={a.attack_bonus}
                    onChange={e => updateAction(a.id, { attack_bonus: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Schaden +</label>
                  <input
                    type="number"
                    value={a.damage_bonus}
                    onChange={e => updateAction(a.id, { damage_bonus: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Ladungen max (0=∞)</label>
                  <input
                    type="number"
                    min={0}
                    value={a.charges_max ?? 0}
                    onChange={e => updateAction(a.id, { charges_max: parseInt(e.target.value) || 0, charges_used: 0 })}
                    className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              {/* Würfel rows */}
              <div className="space-y-1">
                {a.dice_config.map((dc, idx) => (
                  <DiceRow
                    key={idx}
                    dc={dc}
                    onChange={newDc => updateActionDice(a.id, idx, newDc)}
                    onRemove={() => removeActionDice(a.id, idx)}
                  />
                ))}
                <button type="button" onClick={() => addActionDice(a.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300">
                  + Würfel
                </button>
              </div>
              <input
                type="text"
                placeholder="Notiz (optional)"
                value={a.notes}
                onChange={e => updateAction(a.id, { notes: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bonus Aktionen */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-teal-400">Bonus Aktionen</label>
          <button type="button" onClick={addBonusAction}
            className="text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
            + Hinzufügen
          </button>
        </div>
        <div className="space-y-3">
          {formBonusActions.map(a => (
            <div key={a.id} className="bg-teal-950/20 border border-teal-900/40 rounded-lg p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Name der Bonus-Aktion"
                  value={a.name}
                  onChange={e => updateBonusAction(a.id, { name: e.target.value })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
                />
                <button type="button" onClick={() => removeBonusAction(a.id)}
                  className="p-1 text-zinc-600 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Angriff +</label>
                  <input
                    type="number"
                    value={a.attack_bonus}
                    onChange={e => updateBonusAction(a.id, { attack_bonus: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Schaden +</label>
                  <input
                    type="number"
                    value={a.damage_bonus}
                    onChange={e => updateBonusAction(a.id, { damage_bonus: parseInt(e.target.value) || 0 })}
                    className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] text-zinc-500 whitespace-nowrap">Ladungen max (0=∞)</label>
                  <input
                    type="number"
                    min={0}
                    value={a.charges_max ?? 0}
                    onChange={e => updateBonusAction(a.id, { charges_max: parseInt(e.target.value) || 0, charges_used: 0 })}
                    className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                {a.dice_config.map((dc, idx) => (
                  <DiceRow
                    key={idx}
                    dc={dc}
                    onChange={newDc => updateBonusActionDice(a.id, idx, newDc)}
                    onRemove={() => removeBonusActionDice(a.id, idx)}
                  />
                ))}
                <button type="button" onClick={() => addBonusActionDice(a.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300">
                  + Würfel
                </button>
              </div>
              <input
                type="text"
                placeholder="Notiz (optional)"
                value={a.notes}
                onChange={e => updateBonusAction(a.id, { notes: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fähigkeiten */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400">Fähigkeiten</label>
          <button type="button" onClick={addAbility}
            className="text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
            + Hinzufügen
          </button>
        </div>
        <div className="space-y-3">
          {formAbilities.map(a => (
            <div key={a.id} className="bg-zinc-800/50 border border-zinc-700/60 rounded-lg p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Name der Fähigkeit"
                  value={a.name}
                  onChange={e => updateAbility(a.id, { name: e.target.value })}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button type="button" onClick={() => removeAbility(a.id)}
                  className="p-1 text-zinc-600 hover:text-red-400 flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="Beschreibung…"
                value={a.description}
                onChange={e => updateAbility(a.id, { description: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Ladungen max (0=∞)</label>
                  <input
                    type="number"
                    min={0}
                    value={a.charges_max}
                    onChange={e => updateAbility(a.id, { charges_max: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Schadensbonus +</label>
                  <input
                    type="number"
                    value={a.damage_bonus}
                    onChange={e => updateAbility(a.id, { damage_bonus: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              {/* Würfel rows */}
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 block">Schadenswürfel</label>
                {a.dice_config.map((dc, idx) => (
                  <DiceRow
                    key={idx}
                    dc={dc}
                    onChange={newDc => updateAbilityDice(a.id, idx, newDc)}
                    onRemove={() => removeAbilityDice(a.id, idx)}
                  />
                ))}
                <button type="button" onClick={() => addAbilityDice(a.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-zinc-300">
                  + Würfel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Rettungswurf</label>
                  <select
                    value={a.save_type}
                    onChange={e => updateAbility(a.id, { save_type: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                  >
                    {SAVE_TYPES.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </div>
                {a.save_type && (
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-0.5 block">RW-SG</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={a.save_dc}
                      onChange={e => updateAbility(a.id, { save_dc: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
        >
          {saving ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Erstellen'}
        </button>
      </div>
    </form>
  )
}

function parseOptionalInt(v: string): number | null {
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

export default function ExtrasPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [companions, setCompanions]         = useState<CompanionCharacter[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [typeFilter, setTypeFilter]         = useState<CompanionType | 'all'>('all')
  const [showModal, setShowModal]           = useState(false)
  const [editingItem, setEditingItem]       = useState<CompanionCharacter | null>(null)
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM)
  const [formDice, setFormDice]             = useState<CompanionAction[]>([])
  const [formBonusActions, setFormBonusActions] = useState<CompanionAction[]>([])
  const [formAbilities, setFormAbilities]   = useState<Ability[]>([])
  const [saving, setSaving]                 = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deploySuccess, setDeploySuccess]   = useState<string | null>(null)
  const [deployPickerMaps, setDeployPickerMaps] = useState<{id: string, name: string}[]>([])
  const [deployPickerChar, setDeployPickerChar] = useState<CompanionCharacter | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    let query = supabase.from('companion_characters').select('*').order('name', { ascending: true })
    if (!isGM) query = query.eq('created_by', user.id)
    const { data } = await query
    setCompanions((data ?? []) as CompanionCharacter[])
    setLoading(false)
  }, [user, isGM]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    load()
    const ch = supabase
      .channel('companion_characters_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companion_characters' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, load]) // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormDice([])
    setFormBonusActions([])
    setFormAbilities([])
    setShowModal(true)
  }

  const openEdit = (c: CompanionCharacter) => {
    setEditingItem(c)
    setForm({
      name: c.name,
      type: c.type,
      image_url: c.image_url ?? '',
      max_hp: c.max_hp != null ? String(c.max_hp) : '',
      current_hp: c.current_hp != null ? String(c.current_hp) : '',
      armor_class: c.armor_class != null ? String(c.armor_class) : '',
      speed: c.speed != null ? String(c.speed) : '',
      str: c.str != null ? String(c.str) : '',
      dex: c.dex != null ? String(c.dex) : '',
      con: c.con != null ? String(c.con) : '',
      int: c.int != null ? String(c.int) : '',
      wis: c.wis != null ? String(c.wis) : '',
      cha: c.cha != null ? String(c.cha) : '',
      notes: c.notes ?? '',
    })

    // Parse actions with backward compat
    const parsedActions: CompanionAction[] = (c.favorite_dice ?? []).map((a: any) => ({
      id: a.id ?? crypto.randomUUID(),
      name: a.name ?? '',
      attack_bonus: a.attack_bonus ?? 0,
      damage_bonus: a.damage_bonus ?? 0,
      dice_config: a.dice_config ?? (a.dice ? [{ type: 'd6', count: 1 }] : []),
      notes: a.notes ?? '',
      charges_max: a.charges_max ?? 0,
      charges_used: a.charges_used ?? 0,
    }))
    setFormDice(parsedActions)

    // Parse bonus actions with backward compat
    const parsedBonusActions: CompanionAction[] = (c.bonus_actions ?? []).map((a: any) => ({
      id: a.id ?? crypto.randomUUID(),
      name: a.name ?? '',
      attack_bonus: a.attack_bonus ?? 0,
      damage_bonus: a.damage_bonus ?? 0,
      dice_config: a.dice_config ?? [],
      notes: a.notes ?? '',
      charges_max: a.charges_max ?? 0,
      charges_used: a.charges_used ?? 0,
    }))
    setFormBonusActions(parsedBonusActions)

    // Parse abilities with backward compat
    const parsedAbilities: Ability[] = (c.abilities ?? []).map((a: any) => ({
      id: a.id ?? crypto.randomUUID(),
      name: a.name ?? '',
      description: a.description ?? '',
      charges_max: a.charges_max ?? 0,
      charges_used: a.charges_used ?? 0,
      dice_config: a.dice_config ?? (a.damage_formula ? [{ type: 'd6', count: 1 }] : []),
      damage_bonus: a.damage_bonus ?? 0,
      save_type: a.save_type ?? '',
      save_dc: a.save_dc ?? 0,
    }))
    setFormAbilities(parsedAbilities)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormDice([])
    setFormBonusActions([])
    setFormAbilities([])
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      name:          form.name.trim(),
      type:          form.type,
      image_url:     form.image_url.trim() || null,
      max_hp:        parseOptionalInt(form.max_hp),
      current_hp:    parseOptionalInt(form.current_hp),
      armor_class:   parseOptionalInt(form.armor_class),
      speed:         parseOptionalInt(form.speed),
      str:           parseOptionalInt(form.str),
      dex:           parseOptionalInt(form.dex),
      con:           parseOptionalInt(form.con),
      int:           parseOptionalInt(form.int),
      wis:           parseOptionalInt(form.wis),
      cha:           parseOptionalInt(form.cha),
      notes:         form.notes.trim() || null,
      favorite_dice:  formDice,
      bonus_actions:  formBonusActions,
      abilities:      formAbilities,
    }

    if (editingItem) {
      await supabase.from('companion_characters').update(payload).eq('id', editingItem.id)
    } else {
      await supabase.from('companion_characters').insert({
        ...payload,
        created_by: user.id,
        owner_id:   user.id,
      })
    }

    setSaving(false)
    closeModal()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('companion_characters').delete().eq('id', id)
    setDeleteConfirmId(null)
  }

  const applyCompanionHp = async (c: CompanionCharacter, delta: number) => {
    const maxHp = c.max_hp ?? 999
    const current = c.current_hp ?? maxHp
    const newHp = Math.max(0, Math.min(maxHp, current + delta))
    await supabase.from('companion_characters').update({ current_hp: newHp }).eq('id', c.id)
    // Also sync to any linked battle_tokens
    await supabase.from('battle_tokens').update({ current_hp: newHp }).eq('companion_id', c.id)
  }

  const useAbility = async (c: CompanionCharacter, abilityId: string) => {
    const abilities = (c.abilities ?? []).map((a: Ability) =>
      a.id === abilityId && (a.charges_max === 0 || a.charges_used < a.charges_max)
        ? { ...a, charges_used: a.charges_used + 1 } : a
    )
    await supabase.from('companion_characters').update({ abilities }).eq('id', c.id)
  }

  const useAction = async (c: CompanionCharacter, actionId: string, isBonus: boolean) => {
    const field = isBonus ? 'bonus_actions' : 'favorite_dice'
    const actions = ((isBonus ? c.bonus_actions : c.favorite_dice) ?? []).map((a: CompanionAction) =>
      a.id === actionId && ((a.charges_max ?? 0) === 0 || (a.charges_used ?? 0) < (a.charges_max ?? 0))
        ? { ...a, charges_used: (a.charges_used ?? 0) + 1 } : a
    )
    await supabase.from('companion_characters').update({ [field]: actions }).eq('id', c.id)
  }

  const restoreAction = async (c: CompanionCharacter, actionId: string, isBonus: boolean) => {
    const field = isBonus ? 'bonus_actions' : 'favorite_dice'
    const actions = ((isBonus ? c.bonus_actions : c.favorite_dice) ?? []).map((a: CompanionAction) =>
      a.id === actionId && (a.charges_used ?? 0) > 0
        ? { ...a, charges_used: (a.charges_used ?? 0) - 1 } : a
    )
    await supabase.from('companion_characters').update({ [field]: actions }).eq('id', c.id)
  }

  const doDeployToMap = async (c: CompanionCharacter, mapId: string) => {
    const icon = c.image_url && (c.image_url.startsWith('http') || c.image_url.startsWith('/'))
      ? c.image_url
      : TYPE_CONFIG[c.type]?.icon ?? '🐾'
    const abilitiesText = (c.abilities ?? []).length > 0
      ? '\n\nFähigkeiten: ' + c.abilities.map((a: Ability) => a.name + (a.charges_max > 0 ? ` (${a.charges_max}x)` : '')).join(', ')
      : ''
    const notes = (c.notes ?? '') + abilitiesText
    const { error } = await supabase.from('battle_tokens').insert({
      map_id:           mapId,
      companion_id:     c.id,
      name:             c.name,
      icon,
      token_type:       'npc',
      col:              0,
      row:              0,
      max_hp:           c.max_hp,
      current_hp:       c.current_hp ?? c.max_hp,
      armor_class:      c.armor_class,
      speed:            c.speed,
      initiative:       null,
      challenge_rating: null,
      conditions:       [],
      notes:            notes || null,
      stats:            { str: c.str, dex: c.dex, con: c.con, int: c.int, wis: c.wis, cha: c.cha },
      is_hidden:        false,
      favorite_actions: (c.favorite_dice ?? []).map(a => ({
        name:         a.name,
        attack_bonus: a.attack_bonus,
        damage_bonus: a.damage_bonus,
        dice_config:  a.dice_config,
      })),
      player_user_id:   null,
      token_size:       'medium',
      movement_used:    0,
      is_staged:        true,
    })
    if (error) { alert(`Fehler beim Bereitstellen: ${error.message}`); return }
    setDeployPickerChar(null)
    setDeployPickerMaps([])
    setDeploySuccess(`${c.name} wurde bereitgestellt!`)
    setTimeout(() => setDeploySuccess(null), 3000)
  }

  const deployToMap = async (c: CompanionCharacter) => {
    const { data: maps } = await supabase.from('battle_maps').select('id, name').eq('is_active', true)
    if (!maps?.length) { alert('Kein aktives Spielfeld vorhanden. Bitte erst eine Kampfkarte erstellen.'); return }
    if (maps.length === 1) {
      await doDeployToMap(c, maps[0].id)
    } else {
      // Multiple active maps → show picker
      setDeployPickerMaps(maps as {id: string, name: string}[])
      setDeployPickerChar(c)
    }
  }

  const longRest = async (c: CompanionCharacter) => {
    const abilities = (c.abilities ?? []).map((a: Ability) => ({ ...a, charges_used: 0 }))
    const favorite_dice = (c.favorite_dice ?? []).map((a: CompanionAction) => ({ ...a, charges_used: 0 }))
    const bonus_actions = (c.bonus_actions ?? []).map((a: CompanionAction) => ({ ...a, charges_used: 0 }))
    await supabase.from('companion_characters').update({ current_hp: c.max_hp, abilities, favorite_dice, bonus_actions }).eq('id', c.id)
    // Also restore HP on any linked token or placed model
    if (c.max_hp != null) {
      await supabase.from('battle_tokens').update({ current_hp: c.max_hp }).eq('companion_id', c.id)
      await supabase.from('battle_placed_models').update({ current_hp: c.max_hp, abilities }).eq('companion_id', c.id)
    }
  }

  const rollCompanionAction = (c: CompanionCharacter, action: CompanionAction, rollType: 'attack' | 'damage') => {
    if (rollType === 'attack') {
      const roll = Math.floor(Math.random() * 20) + 1 + action.attack_bonus
      alert(`${c.name} — ${action.name} Angriff: ${roll} (1d20 ${action.attack_bonus >= 0 ? '+' : ''}${action.attack_bonus})`)
    } else {
      let total = action.damage_bonus
      const parts: string[] = []
      for (const dc of (action.dice_config ?? [])) {
        const sides = parseInt(dc.type.slice(1))
        let sum = 0
        for (let i = 0; i < dc.count; i++) sum += Math.floor(Math.random() * sides) + 1
        total += sum
        parts.push(`${dc.count}${dc.type}`)
      }
      alert(`${c.name} — ${action.name} Schaden: ${total} (${parts.join('+')}${action.damage_bonus ? `+${action.damage_bonus}` : ''})`)
    }
  }

  const rollAbility = (c: CompanionCharacter, ability: Ability) => {
    let total = ability.damage_bonus
    const parts: string[] = []
    for (const dc of ability.dice_config) {
      const sides = parseInt(dc.type.slice(1))
      let sum = 0
      for (let i = 0; i < dc.count; i++) sum += Math.floor(Math.random() * sides) + 1
      total += sum
      parts.push(`${dc.count}${dc.type}`)
    }
    const saveInfo = ability.save_type ? ` (RW: ${ability.save_type} SG ${ability.save_dc})` : ''
    alert(`${c.name} — ${ability.name}: ${total} Schaden${saveInfo} (${parts.join('+')}${ability.damage_bonus ? `+${ability.damage_bonus}` : ''})`)
  }

  const appendNote = async (c: CompanionCharacter, newText: string) => {
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const entry = `[${date}] ${newText.trim()}`
    const existing = c.notes ?? ''
    const updated = existing ? `${entry}\n\n${existing}` : entry
    await supabase.from('companion_characters').update({ notes: updated }).eq('id', c.id)
  }

  const filtered = companions.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.notes ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || c.type === typeFilter
    return matchSearch && matchType
  })

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 relative">
      {/* Deploy Toast */}
      {deploySuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-900 border border-emerald-600/60 text-emerald-200 text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl shadow-black/40 animate-fade-in">
          ✅ {deploySuccess}
        </div>
      )}

      {/* Deploy Map Picker Modal */}
      {deployPickerChar && deployPickerMaps.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-80 shadow-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚔️</span>
              <p className="font-bold text-zinc-100 flex-1">Auf welches Spielfeld?</p>
              <button onClick={() => { setDeployPickerChar(null); setDeployPickerMaps([]) }}
                className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-300 font-semibold">{deployPickerChar.name}</span> bereitstellen auf:
            </p>
            <div className="space-y-2">
              {deployPickerMaps.map(m => (
                <button key={m.id}
                  onClick={() => doDeployToMap(deployPickerChar, m.id)}
                  className="w-full py-2.5 rounded-lg bg-amber-900/30 border border-amber-700/50 text-sm text-amber-200 hover:bg-amber-900/60 text-left px-3 transition-colors">
                  🗺 {m.name}
                </button>
              ))}
            </div>
            <button onClick={() => { setDeployPickerChar(null); setDeployPickerMaps([]) }}
              className="w-full py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-500 hover:text-zinc-300">
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PawPrint className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Extras / NPCs</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{companions.length}</span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Erstellen
        </button>
      </div>

      {/* Mini Dice Panel */}
      <MiniDicePanel title="🎲 Würfelwurf" />

      {/* Search + Filter */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Name oder Notizen suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as CompanionType | 'all')}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Alle Typen</option>
          {(Object.keys(TYPE_CONFIG) as CompanionType[]).map(t => (
            <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center text-zinc-600 py-16">
          <p className="text-sm">Wird geladen…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-600 py-16">
          <PawPrint className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {search || typeFilter !== 'all' ? 'Keine Einträge gefunden.' : 'Noch keine Begleiter erstellt.'}
          </p>
          {!search && typeFilter === 'all' && (
            <button onClick={openCreate} className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline">
              Ersten Begleiter erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CompanionCard
              key={c.id}
              c={c}
              isGM={isGM}
              userId={user.id}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
              onApplyHp={applyCompanionHp}
              onUseAbility={useAbility}
              onDeploy={deployToMap}
              onRest={longRest}
              onRollAction={rollCompanionAction}
              onRollAbility={rollAbility}
              onAppendNote={appendNote}
              onUseAction={useAction}
              onRestoreAction={restoreAction}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-zinc-100">
                {editingItem ? 'Begleiter bearbeiten' : 'Neuen Begleiter erstellen'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CompanionForm
              form={form}
              setForm={setForm}
              onSubmit={handleSave}
              onCancel={closeModal}
              saving={saving}
              isEdit={!!editingItem}
              formDice={formDice}
              setFormDice={setFormDice}
              formBonusActions={formBonusActions}
              setFormBonusActions={setFormBonusActions}
              formAbilities={formAbilities}
              setFormAbilities={setFormAbilities}
            />
          </div>
        </div>
      )}
    </div>
  )
}
