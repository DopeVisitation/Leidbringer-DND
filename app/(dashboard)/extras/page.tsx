'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, Pencil, Trash2, PawPrint, Heart, Shield, Zap, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

type CompanionType = 'pet' | 'summon' | 'familiar' | 'npc' | 'mount'

interface Ability {
  id: string
  name: string
  description: string
  charges_max: number
  charges_used: number
  damage_formula: string
  save_type: string
  save_dc: number
}

interface FavDice {
  id: string
  name: string
  dice: string
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
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
  notes: string | null
  owner_id: string | null
  created_by: string | null
  favorite_dice: FavDice[]
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

function CompanionCard({
  c, isGM, userId, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId,
  onApplyHp, onUseAbility, onDeploy,
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

        {/* Abilities */}
        {c.abilities && c.abilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.abilities.map((a) => {
              const hasCharges = a.charges_max > 0
              const exhausted = hasCharges && a.charges_used >= a.charges_max
              return (
                <button
                  key={a.id}
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
              )
            })}
          </div>
        )}

        {/* Würfelfavoriten */}
        {c.favorite_dice && c.favorite_dice.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.favorite_dice.map((d) => (
              <span key={d.id} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300" title={d.name}>
                🎲 {d.dice}
              </span>
            ))}
          </div>
        )}

        {/* Notes */}
        {c.notes && (
          <p className="text-xs text-zinc-400 whitespace-pre-wrap line-clamp-3">{c.notes}</p>
        )}
      </div>
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
  formAbilities,
  setFormAbilities,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
  formDice: FavDice[]
  setFormDice: (d: FavDice[]) => void
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

  const addDice = () => {
    setFormDice([...formDice, { id: crypto.randomUUID(), name: '', dice: '' }])
  }
  const removeDice = (id: string) => setFormDice(formDice.filter(d => d.id !== id))
  const updateDice = (id: string, field: keyof FavDice, value: string) =>
    setFormDice(formDice.map(d => d.id === id ? { ...d, [field]: value } : d))

  const addAbility = () => {
    setFormAbilities([...formAbilities, {
      id: crypto.randomUUID(), name: '', description: '',
      charges_max: 0, charges_used: 0, damage_formula: '', save_type: '', save_dc: 0,
    }])
  }
  const removeAbility = (id: string) => setFormAbilities(formAbilities.filter(a => a.id !== id))
  const updateAbility = (id: string, field: keyof Ability, value: string | number) =>
    setFormAbilities(formAbilities.map(a => a.id === id ? { ...a, [field]: value } : a))

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

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Actions / Fähigkeiten</label>
        <textarea
          rows={8}
          placeholder="Beschreibung, Hintergrund, Angriffsbeschreibungen…"
          value={form.notes}
          onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-y min-h-[140px]"
        />
      </div>

      {/* Würfelfavoriten */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400">Würfelfavoriten</label>
          <button type="button" onClick={addDice}
            className="text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500">
            + Hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {formDice.map(d => (
            <div key={d.id} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Name"
                value={d.name}
                onChange={e => updateDice(d.id, 'name', e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="2d6+3"
                value={d.dice}
                onChange={e => updateDice(d.id, 'dice', e.target.value)}
                className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button type="button" onClick={() => removeDice(d.id)}
                className="p-1 text-zinc-600 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Aktionen / Fähigkeiten */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400">Aktionen / Fähigkeiten</label>
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
                  required={formAbilities.some(ab => ab.id === a.id && ab.name !== '')}
                  placeholder="Name der Fähigkeit *"
                  value={a.name}
                  onChange={e => updateAbility(a.id, 'name', e.target.value)}
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
                onChange={e => updateAbility(a.id, 'description', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Schadenswürfel</label>
                  <input
                    type="text"
                    placeholder="10d6"
                    value={a.damage_formula}
                    onChange={e => updateAbility(a.id, 'damage_formula', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Ladungen max (0=unbegrenzt)</label>
                  <input
                    type="number"
                    min={0}
                    value={a.charges_max}
                    onChange={e => updateAbility(a.id, 'charges_max', parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 mb-0.5 block">Rettungswurf</label>
                  <select
                    value={a.save_type}
                    onChange={e => updateAbility(a.id, 'save_type', e.target.value)}
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
                      onChange={e => updateAbility(a.id, 'save_dc', parseInt(e.target.value) || 0)}
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
  const [formDice, setFormDice]             = useState<FavDice[]>([])
  const [formAbilities, setFormAbilities]   = useState<Ability[]>([])
  const [saving, setSaving]                 = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('companion_characters')
      .select('*')
      .order('name', { ascending: true })
    setCompanions((data ?? []) as CompanionCharacter[])
    setLoading(false)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setFormDice(c.favorite_dice ?? [])
    setFormAbilities(c.abilities ?? [])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormDice([])
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
      favorite_dice: formDice,
      abilities:     formAbilities,
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
    await supabase.from('battle_placed_models').update({ current_hp: newHp }).eq('companion_id', c.id)
  }

  const useAbility = async (c: CompanionCharacter, abilityId: string) => {
    const abilities = (c.abilities ?? []).map((a: Ability) =>
      a.id === abilityId && (a.charges_max === 0 || a.charges_used < a.charges_max)
        ? { ...a, charges_used: a.charges_used + 1 } : a
    )
    await supabase.from('companion_characters').update({ abilities }).eq('id', c.id)
    await supabase.from('battle_placed_models').update({ abilities }).eq('companion_id', c.id)
  }

  const deployToMap = async (c: CompanionCharacter) => {
    const { data: maps } = await supabase.from('battle_maps').select('id').eq('is_active', true).limit(1)
    if (!maps?.length) { alert('Kein aktives Spielfeld vorhanden.'); return }
    const mapId = maps[0].id
    await supabase.from('battle_placed_models').insert({
      map_id:        mapId,
      companion_id:  c.id,
      name:          c.name,
      image_url:     c.image_url ?? '',
      col:           0, row: 0,
      span:          1,
      rotation:      0,
      is_hidden:     false,
      z_index:       10,
      current_hp:    c.current_hp ?? c.max_hp,
      max_hp:        c.max_hp,
      armor_class:   c.armor_class,
      speed:         c.speed,
      model_stats:   { str: c.str, dex: c.dex, con: c.con, int: c.int, wis: c.wis, cha: c.cha },
      notes:         c.notes,
      favorite_dice: c.favorite_dice ?? [],
      abilities:     c.abilities ?? [],
    })
    alert(`${c.name} wurde auf dem Spielfeld bereitgestellt (Feld 0,0). Bitte auf dem Spielfeld positionieren.`)
  }

  const filtered = companions.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.notes ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || c.type === typeFilter
    return matchSearch && matchType
  })

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
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
              formAbilities={formAbilities}
              setFormAbilities={setFormAbilities}
            />
          </div>
        </div>
      )}
    </div>
  )
}
