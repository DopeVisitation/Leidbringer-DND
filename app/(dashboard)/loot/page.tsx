'use client'

import { useState, useEffect } from 'react'
import { Backpack, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { LootItem, LootRarity } from '@/types'

const RARITY_CONFIG: Record<LootRarity, { label: string; text: string; border: string; bg: string; glow: string }> = {
  common:    { label: 'Gewöhnlich',   text: 'text-zinc-300',   border: 'border-zinc-600',   bg: 'bg-zinc-800',        glow: '' },
  uncommon:  { label: 'Ungewöhnlich', text: 'text-green-300',  border: 'border-green-700',  bg: 'bg-green-950/40',    glow: 'shadow-[0_0_8px_rgba(34,197,94,0.15)]' },
  rare:      { label: 'Selten',       text: 'text-blue-300',   border: 'border-blue-700',   bg: 'bg-blue-950/40',     glow: 'shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
  very_rare: { label: 'Sehr selten',  text: 'text-purple-300', border: 'border-purple-700', bg: 'bg-purple-950/40',   glow: 'shadow-[0_0_10px_rgba(168,85,247,0.25)]' },
  legendary: { label: 'Legendär',     text: 'text-amber-300',  border: 'border-amber-500',  bg: 'bg-amber-950/30',    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.3)]' },
}

const LOOT_ICONS = [
  '📦','⚔️','🗡️','🏹','🪃','🔱','🛡️','🧤','🥾','🪖',
  '🔮','🪄','🧿','💫','⚡','🧪','🍶','💊','🫙',
  '💰','💎','👑','🏆','📿','💍','🗝️','🔑','📜','📖',
  '🗺️','🧲','🪬','🎁','🐉','💀','🌟','🔥','❄️','☠️',
]

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

  const filtered = filterRarity === 'all' ? items : items.filter((i) => i.rarity === filterRarity)

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
              <option value="">Niemandem zugewiesen</option>
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
          Alle ({items.length})
        </button>
        {(Object.keys(RARITY_CONFIG) as LootRarity[]).map((r) => {
          const cnt = items.filter((i) => i.rarity === r).length
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

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center text-zinc-600 py-16">
          <Backpack className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch kein Loot eingetragen.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const rCfg = RARITY_CONFIG[item.rarity ?? 'common']
            const canDelete = isGM || item.created_by === user?.id
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
                    {(isGM || item.created_by === user?.id) ? (
                      <select
                        value={(item.assigned_profile as any)?.id ?? ''}
                        onChange={(e) => handleAssign(item.id, e.target.value)}
                        className="text-xs bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Nicht zugewiesen</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
                      </select>
                    ) : (item.assigned_profile as any)?.username ? (
                      <span className={`text-xs font-medium ${rCfg.text}`}>
                        → {(item.assigned_profile as any).username}
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
