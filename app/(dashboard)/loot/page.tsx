'use client'

import { useState, useEffect } from 'react'
import { Backpack, Plus, Trash2, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { LootItem, LootRarity } from '@/types'

const RARITY_CONFIG: Record<LootRarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Gewöhnlich', color: 'text-zinc-400',   bg: 'bg-zinc-700' },
  uncommon:  { label: 'Ungewöhnlich', color: 'text-green-400', bg: 'bg-green-900/30' },
  rare:      { label: 'Selten', color: 'text-blue-400',      bg: 'bg-blue-900/30' },
  very_rare: { label: 'Sehr selten', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  legendary: { label: 'Legendär', color: 'text-amber-400',   bg: 'bg-amber-900/30' },
}

export default function LootPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()
  const [items, setItems] = useState<LootItem[]>([])
  const [profiles, setProfiles] = useState<{ id: string; username: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    quantity: 1,
    rarity: 'common' as LootRarity,
    assigned_to: '',
  })
  const [saving, setSaving] = useState(false)
  const [filterRarity, setFilterRarity] = useState<LootRarity | 'all'>('all')

  useEffect(() => {
    loadItems()
    loadProfiles()
    const channel = supabase
      .channel('loot_items')
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
      name: form.name,
      description: form.description || null,
      quantity: form.quantity,
      rarity: form.rarity,
      assigned_to: form.assigned_to || null,
      created_by: user.id,
    })
    setForm({ name: '', description: '', quantity: 1, rarity: 'common', assigned_to: '' })
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
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Hinzufügen
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Neuer Loot-Eintrag</p>
            <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  required
                  placeholder="Name des Items *"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  placeholder="Anzahl"
                />
              </div>
              <div>
                <select
                  value={form.rarity}
                  onChange={(e) => setForm((p) => ({ ...p, rarity: e.target.value as LootRarity }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(RARITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <textarea
                  rows={2}
                  placeholder="Beschreibung (optional)"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="col-span-2">
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Niemandem zugewiesen</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
            >
              {saving ? 'Speichern...' : 'Eintrag hinzufügen'}
            </button>
          </form>
        </div>
      )}

      {/* Filter */}
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
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                <div className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold ${rCfg.color} ${rCfg.bg} flex-shrink-0`}>
                  {rCfg.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.quantity > 1 && <span className="text-amber-400 mr-1">{item.quantity}x</span>}
                        {item.name}
                      </p>
                      {item.description && <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>}
                    </div>
                    {canDelete && (
                      <button onClick={() => handleDelete(item.id)} className="text-zinc-700 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-zinc-600">Von: {(item.creator as any)?.username ?? '?'}</span>
                    {(isGM || item.created_by === user?.id) ? (
                      <select
                        value={(item.assigned_profile as any)?.id ?? ''}
                        onChange={(e) => handleAssign(item.id, e.target.value)}
                        className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Nicht zugewiesen</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
                      </select>
                    ) : (item.assigned_profile as any)?.username ? (
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <User className="w-3 h-3" /> {(item.assigned_profile as any).username}
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
