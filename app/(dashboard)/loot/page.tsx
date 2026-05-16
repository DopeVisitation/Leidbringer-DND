'use client'

import { useState, useEffect } from 'react'
import { Backpack, Plus, Trash2, X, User, Dices } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { LootItem, LootRarity } from '@/types'
import {
  LOOT_TABLES, LOOT_CATEGORIES, LOOT_RARITY_LABELS,
  rollD4, rollD100, getItemFromTable,
  type LootRarityKey, type LootCategory,
} from '@/lib/loot-tables'

const RARITY_CONFIG: Record<LootRarity, { label: string; text: string; border: string; bg: string; glow: string }> = {
  common:    { label: 'Gewöhnlich',   text: 'text-zinc-300',   border: 'border-zinc-600',   bg: 'bg-zinc-800',        glow: '' },
  uncommon:  { label: 'Ungewöhnlich', text: 'text-green-300',  border: 'border-green-700',  bg: 'bg-green-950/40',    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.15)]' },
  rare:      { label: 'Selten',       text: 'text-blue-300',   border: 'border-blue-700',   bg: 'bg-blue-950/40',     glow: 'shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
  very_rare: { label: 'Sehr selten',  text: 'text-purple-300', border: 'border-purple-700', bg: 'bg-purple-950/40',   glow: 'shadow-[0_0_10px_rgba(168,85,247,0.25)]' },
  legendary: { label: 'Legendär',     text: 'text-amber-300',  border: 'border-amber-500',  bg: 'bg-amber-950/30',    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.3)]' },
}

const RARITY_ROLL_COLORS: Record<LootRarityKey, string> = {
  common:    'bg-zinc-700 text-zinc-200 border-zinc-600',
  uncommon:  'bg-green-900/60 text-green-200 border-green-700',
  rare:      'bg-blue-900/60 text-blue-200 border-blue-700',
  very_rare: 'bg-purple-900/60 text-purple-200 border-purple-700',
  legendary: 'bg-amber-900/60 text-amber-200 border-amber-600',
}

const LOOT_ICONS = [
  '📦','⚔️','🗡️','🏹','🪃','🔱','🛡️','🧤','🥾','🪖',
  '🔮','🪄','🧿','💫','⚡','🧪','🍶','💊','🫙',
  '💰','💎','👑','🏆','📿','💍','🗝️','🔑','📜','📖',
  '🗺️','🧲','🪬','🎁','🐉','💀','🌟','🔥','❄️','☠️',
]

const CATEGORY_ICONS: Record<LootCategory, string> = {
  Arcana: '🔮', Armaments: '⚔️', Implements: '🛠️', Relics: '✨',
}

type Tab = 'group' | 'personal'

interface RollResult {
  d4: number
  category: LootCategory
  d100: number
  item: string | null
}

export default function LootPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()
  const [items, setItems] = useState<LootItem[]>([])
  const [profiles, setProfiles] = useState<{ id: string; username: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', quantity: 1,
    rarity: 'common' as LootRarity, assigned_to: '', icon: '📦',
  })
  const [saving, setSaving] = useState(false)
  const [filterRarity, setFilterRarity] = useState<LootRarity | 'all'>('all')
  const [activeTab, setActiveTab] = useState<Tab>('group')

  // Roll state
  const [showRollPanel, setShowRollPanel] = useState(false)
  const [rollRarity, setRollRarity] = useState<LootRarityKey>('common')
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [rolling, setRolling] = useState(false)
  const [addingRoll, setAddingRoll] = useState(false)

  useEffect(() => {
    loadItems()
    loadProfiles()
    const channel = supabase.channel('loot_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loot_items' }, loadItems)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadItems = async () => {
    const { data } = await supabase
      .from('loot_items')
      .select('*, assigned_profile:profiles!loot_items_assigned_to_fkey(id,username), creator:profiles!loot_items_created_by_fkey(id,username)')
      .order('created_at', { ascending: false })
    if (data) setItems(data as LootItem[])
  }

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, username').order('username')
    if (data) setProfiles(data)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('loot_items').insert({
      name: form.name, description: form.description || null,
      quantity: form.quantity, rarity: form.rarity,
      assigned_to: form.assigned_to || null,
      created_by: user.id, icon: form.icon,
    })
    setForm({ name: '', description: '', quantity: 1, rarity: 'common', assigned_to: '', icon: '📦' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('loot_items').delete().eq('id', id)
  }

  const handleAssign = async (id: string, userId: string) => {
    await supabase.from('loot_items').update({ assigned_to: userId || null }).eq('id', id)
  }

  // ── Loot Table Roll ───────────────────────────────────────────────────────
  const handleRoll = () => {
    setRolling(true)
    setRollResult(null)
    setTimeout(() => {
      const d4 = rollD4()
      const cat = LOOT_CATEGORIES.find((c) => c.d4 === d4)!
      const d100 = rollD100()
      const item = getItemFromTable(rollRarity, cat.key, d100)
      setRollResult({ d4, category: cat.key, d100, item })
      setRolling(false)
    }, 400)
  }

  const handleAddRolled = async () => {
    if (!rollResult?.item || !user) return
    setAddingRoll(true)
    const now = new Date()
    const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const username = profiles.find((p) => p.id === user.id)?.username ?? user.email ?? '?'
    const catInfo = LOOT_CATEGORIES.find((c) => c.key === rollResult.category)!
    const note = `${catInfo.emoji} ${rollResult.category} · d4=${rollResult.d4} · d100=${rollResult.d100} · Gewürfelt von ${username} am ${dateStr}`
    await supabase.from('loot_items').insert({
      name: rollResult.item,
      description: note,
      quantity: 1,
      rarity: rollRarity,
      assigned_to: null,
      created_by: user.id,
      icon: catInfo.emoji === '🔮' ? '🔮' : catInfo.emoji === '⚔️' ? '⚔️' : catInfo.emoji === '🛠️' ? '📦' : '✨',
    })
    setRollResult(null)
    setShowRollPanel(false)
    setAddingRoll(false)
  }

  // Group loot = not assigned to anyone
  const groupItems = items.filter((i) => !i.assigned_to)
  // Personal loot = assigned to current user (players see own; GM sees all assigned)
  const personalItems = isGM
    ? items.filter((i) => i.assigned_to)
    : items.filter((i) => i.assigned_to === user?.id)

  const applyRarityFilter = (list: LootItem[]) =>
    filterRarity === 'all' ? list : list.filter((i) => i.rarity === filterRarity)

  const displayItems = applyRarityFilter(activeTab === 'group' ? groupItems : personalItems)
  const tabItems = activeTab === 'group' ? groupItems : personalItems

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Backpack className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Loot</h1>
          <span className="text-sm text-zinc-500">{items.length} Items</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Hinzufügen
        </button>
      </div>

      {/* ── Loot-Tabelle würfeln ─────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
        <button
          onClick={() => { setShowRollPanel(!showRollPanel); setRollResult(null) }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Dices className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <p className="text-sm font-bold text-zinc-100">Loot-Tabelle würfeln</p>
              <p className="text-xs text-zinc-500">Seltenheit wählen → d4 (Kategorie) → d100 (Item)</p>
            </div>
          </div>
          <span className="text-zinc-500 text-xs">{showRollPanel ? '▲' : '▼'}</span>
        </button>

        {showRollPanel && (
          <div className="border-t border-zinc-800 p-5 space-y-4">
            {/* Rarity selector */}
            <div>
              <p className="text-xs text-zinc-500 mb-2 font-medium">1. Seltenheit wählen</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(LOOT_RARITY_LABELS) as LootRarityKey[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRollRarity(r); setRollResult(null) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      rollRarity === r
                        ? RARITY_ROLL_COLORS[r] + ' ring-2 ring-offset-1 ring-offset-zinc-900 ring-white/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {LOOT_RARITY_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Roll button */}
            <button
              onClick={handleRoll}
              disabled={rolling}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-base font-bold text-white transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center gap-3"
            >
              <Dices className={`w-6 h-6 ${rolling ? 'animate-spin' : ''}`} />
              {rolling ? 'Würfelt...' : '🎲 Würfeln!'}
            </button>

            {/* Result */}
            {rollResult && (
              <div className={`rounded-xl border p-4 space-y-3 ${RARITY_ROLL_COLORS[rollRarity]}`}>
                {/* Dice results */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-zinc-400 mb-1">d4</span>
                    <div className="w-12 h-12 rounded-lg bg-zinc-900/60 border border-zinc-600 flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                      {rollResult.d4}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-zinc-400 mb-1">Kategorie</span>
                    <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-600 text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>{CATEGORY_ICONS[rollResult.category]}</span>
                      <span>{rollResult.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-zinc-400 mb-1">d100</span>
                    <div className="w-12 h-12 rounded-lg bg-zinc-900/60 border border-zinc-600 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                      {rollResult.d100 === 100 ? '00' : rollResult.d100}
                    </div>
                  </div>
                </div>

                {/* Item result */}
                {rollResult.item ? (
                  <div className="bg-zinc-900/60 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-1">Ergebnis</p>
                    <p className="text-base font-bold text-white">{rollResult.item}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {LOOT_RARITY_LABELS[rollRarity]} · {CATEGORY_ICONS[rollResult.category]} {rollResult.category}
                    </p>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 rounded-lg p-3 text-center">
                    <p className="text-sm text-zinc-400">Kein Eintrag für d100={rollResult.d100} in {rollResult.category}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleRoll}
                    disabled={rolling}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-zinc-200 transition-colors"
                  >
                    Nochmal würfeln
                  </button>
                  {rollResult.item && (
                    <button
                      onClick={handleAddRolled}
                      disabled={addingRoll}
                      className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-sm font-bold text-white transition-colors"
                    >
                      {addingRoll ? 'Wird hinzugefügt...' : '+ Zum Loot hinzufügen'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs: Gruppen-Loot / Persönlicher Loot */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'group'
              ? 'bg-amber-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Backpack className="w-4 h-4" />
          Gruppen-Loot
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'group' ? 'bg-amber-700 text-amber-100' : 'bg-zinc-800 text-zinc-500'}`}>
            {groupItems.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'personal'
              ? 'bg-amber-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-4 h-4" />
          {isGM ? 'Zugewiesener Loot' : 'Mein Loot'}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'personal' ? 'bg-amber-700 text-amber-100' : 'bg-zinc-800 text-zinc-500'}`}>
            {personalItems.length}
          </span>
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Neuer Loot-Eintrag</p>
            <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-300"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            {/* Icon + Name */}
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-amber-500 text-2xl flex items-center justify-center transition-colors"
                >
                  {form.icon}
                </button>
                {showIconPicker && (
                  <div className="absolute top-14 left-0 z-10 bg-zinc-900 border border-zinc-700 rounded-xl p-3 grid grid-cols-8 gap-1.5 w-64 shadow-xl">
                    {LOOT_ICONS.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => { setForm((p) => ({ ...p, icon: ico })); setShowIconPicker(false) }}
                        className={`w-7 h-7 rounded text-lg hover:bg-zinc-700 flex items-center justify-center transition-colors ${form.icon === ico ? 'bg-amber-600/30' : ''}`}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text" required placeholder="Name des Items *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" min={1} value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                placeholder="Anzahl"
              />
              <select
                value={form.rarity}
                onChange={(e) => setForm((p) => ({ ...p, rarity: e.target.value as LootRarity }))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {(Object.entries(RARITY_CONFIG) as [LootRarity, typeof RARITY_CONFIG[LootRarity]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <textarea
              rows={2} placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">Gruppen-Loot (niemandem zugewiesen)</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>

            <button
              type="submit" disabled={saving}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
            >
              {saving ? 'Speichern...' : 'Eintrag hinzufügen'}
            </button>
          </form>
        </div>
      )}

      {/* Seltenheits-Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterRarity('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRarity === 'all' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          Alle ({tabItems.length})
        </button>
        {(Object.keys(RARITY_CONFIG) as LootRarity[]).map((r) => {
          const cnt = tabItems.filter((i) => i.rarity === r).length
          if (!cnt) return null
          return (
            <button
              key={r}
              onClick={() => setFilterRarity(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterRarity === r ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              {RARITY_CONFIG[r].label} ({cnt})
            </button>
          )
        })}
      </div>

      {/* Tab-Beschreibung */}
      {activeTab === 'personal' && !isGM && personalItems.length === 0 && (
        <div className="text-center text-zinc-600 py-10">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Dir wurde noch kein Loot zugewiesen.</p>
        </div>
      )}

      {/* Liste */}
      {displayItems.length === 0 && !(activeTab === 'personal' && !isGM && personalItems.length === 0) ? (
        <div className="text-center text-zinc-600 py-16">
          <Backpack className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {activeTab === 'group' ? 'Kein Gruppen-Loot vorhanden.' : 'Kein zugewiesener Loot.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const rCfg = RARITY_CONFIG[item.rarity ?? 'common']
            const canDelete = isGM || item.created_by === user?.id
            const canAssign = isGM || item.created_by === user?.id
            return (
              <div key={item.id} className={`border rounded-xl p-4 flex items-start gap-4 transition-all ${rCfg.border} ${rCfg.bg} ${rCfg.glow}`}>
                {/* Icon */}
                <div className="text-3xl flex-shrink-0 mt-0.5">
                  {(item as any).icon ?? '📦'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${rCfg.text}`}>
                          {item.quantity > 1 && <span className="text-amber-400 mr-1">{item.quantity}×</span>}
                          {item.name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${rCfg.border} ${rCfg.text} opacity-80`}>
                          {rCfg.label}
                        </span>
                      </div>
                      {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-700 hover:text-red-400 flex-shrink-0 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-zinc-600">Von: {(item.creator as any)?.username ?? '?'}</span>
                    {canAssign ? (
                      <select
                        value={(item.assigned_profile as any)?.id ?? ''}
                        onChange={(e) => handleAssign(item.id, e.target.value)}
                        className="text-xs bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Gruppen-Loot</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
                      </select>
                    ) : activeTab === 'personal' ? (
                      <span className={`text-xs font-medium ${rCfg.text}`}>
                        → {(item.assigned_profile as any)?.username ?? '?'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
