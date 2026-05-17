'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Search, ChevronDown, ChevronUp, Pencil, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface NPC {
  id: string
  name: string
  location: string | null
  faction: string | null
  status: NPCStatus
  emoji: string
  description: string | null
  notes: string | null
  is_visible_to_players: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

type NPCStatus = 'alive' | 'dead' | 'unknown' | 'hostile' | 'friendly' | 'neutral'

const STATUS_CONFIG: Record<NPCStatus, { label: string; color: string }> = {
  alive:    { label: 'Lebt',        color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50' },
  dead:     { label: 'Tot',         color: 'text-red-400 bg-red-900/20 border-red-800/50' },
  unknown:  { label: 'Unbekannt',   color: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50' },
  hostile:  { label: 'Feindlich',   color: 'text-red-400 bg-red-900/20 border-red-800/50' },
  friendly: { label: 'Freundlich',  color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50' },
  neutral:  { label: 'Neutral',     color: 'text-zinc-400 bg-zinc-800/50 border-zinc-700' },
}

const EMOJI_OPTIONS = ['🧙', '🧝', '🧟', '🧛', '👴', '👵', '🧔', '👩', '🧑', '👨', '🛡️', '⚔️', '👑', '🔮', '🪄', '🐉', '👺', '👹', '🗡️', '💂']

const EMPTY_FORM = {
  emoji: '🧙',
  name: '',
  location: '',
  faction: '',
  status: 'unknown' as NPCStatus,
  description: '',
  notes: '',
  is_visible_to_players: true,
}

export default function NPCsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [npcs, setNpcs] = useState<NPC[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NPCStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadNPCs = useCallback(async () => {
    const { data } = await supabase
      .from('npcs')
      .select('*')
      .order('name', { ascending: true })
    if (data) setNpcs(data as NPC[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadNPCs()
    const channel = supabase
      .channel('npcs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'npcs' }, loadNPCs)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadNPCs])

  const openCreate = () => {
    setEditingNPC(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (npc: NPC, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNPC(npc)
    setForm({
      emoji: npc.emoji,
      name: npc.name,
      location: npc.location ?? '',
      faction: npc.faction ?? '',
      status: npc.status,
      description: npc.description ?? '',
      notes: npc.notes ?? '',
      is_visible_to_players: npc.is_visible_to_players,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingNPC(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      emoji: form.emoji,
      name: form.name.trim(),
      location: form.location.trim() || null,
      faction: form.faction.trim() || null,
      status: form.status,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      is_visible_to_players: form.is_visible_to_players,
      updated_at: new Date().toISOString(),
    }

    if (editingNPC) {
      await supabase.from('npcs').update(payload).eq('id', editingNPC.id)
    } else {
      await supabase.from('npcs').insert({ ...payload, created_by: user.id })
    }

    setSaving(false)
    closeModal()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id)
      return
    }
    await supabase.from('npcs').delete().eq('id', id)
    setDeleteConfirmId(null)
    if (expandedId === id) setExpandedId(null)
  }

  const filtered = npcs.filter((npc) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || npc.name.toLowerCase().includes(q)
      || (npc.location ?? '').toLowerCase().includes(q)
      || (npc.faction ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || npc.status === statusFilter
    return matchSearch && matchStatus
  })

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">NPCs</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{npcs.length}</span>
        </div>
        {isGM && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            NPC erstellen
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Name, Ort oder Fraktion suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NPCStatus | 'all')}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Alle Status</option>
          {(Object.keys(STATUS_CONFIG) as NPCStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* NPC List */}
      {loading ? (
        <div className="text-center text-zinc-600 py-16">
          <p className="text-sm">Wird geladen…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-600 py-16">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search || statusFilter !== 'all' ? 'Keine NPCs gefunden.' : 'Noch keine NPCs angelegt.'}</p>
          {isGM && !search && statusFilter === 'all' && (
            <button onClick={openCreate} className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline">
              Ersten NPC erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((npc) => {
            const isExpanded = expandedId === npc.id
            const statusCfg = STATUS_CONFIG[npc.status] ?? STATUS_CONFIG.unknown

            return (
              <div
                key={npc.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                {/* Card Header */}
                <button
                  className="w-full text-left p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : npc.id)}
                >
                  <span className="text-2xl flex-shrink-0 select-none">{npc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-100">{npc.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {isGM && !npc.is_visible_to_players && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500 bg-zinc-800/50">
                          Nur GM
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {npc.location && (
                        <span className="text-xs text-zinc-500">{npc.location}</span>
                      )}
                      {npc.faction && (
                        <span className="text-xs text-zinc-500 opacity-70">· {npc.faction}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isGM && (
                      <>
                        <button
                          onClick={(e) => openEdit(npc, e)}
                          className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(npc.id, e)}
                          className={`p-1.5 rounded transition-colors ${
                            deleteConfirmId === npc.id
                              ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40'
                              : 'text-zinc-600 hover:text-red-400 hover:bg-zinc-700'
                          }`}
                          title={deleteConfirmId === npc.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-zinc-600 ml-1" />
                      : <ChevronDown className="w-4 h-4 text-zinc-600 ml-1" />
                    }
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (npc.description || npc.notes) && (
                  <div className="border-t border-zinc-800 px-4 pb-4 pt-3 space-y-3">
                    {npc.description && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Beschreibung</p>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{npc.description}</p>
                      </div>
                    )}
                    {isGM && npc.notes && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">GM-Notizen</p>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">{npc.notes}</p>
                      </div>
                    )}
                  </div>
                )}
                {isExpanded && !npc.description && !npc.notes && (
                  <div className="border-t border-zinc-800 px-4 py-3">
                    <p className="text-xs text-zinc-600 italic">Keine Beschreibung vorhanden.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && isGM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-zinc-100">
                {editingNPC ? 'NPC bearbeiten' : 'Neuen NPC erstellen'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Emoji</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, emoji: em }))}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                        form.emoji === em
                          ? 'bg-amber-600/30 border-2 border-amber-500 scale-110'
                          : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="NPC-Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Location + Faction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ort</label>
                  <input
                    type="text"
                    placeholder="z.B. Baldur's Gate"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Fraktion</label>
                  <input
                    type="text"
                    placeholder="z.B. Händlergilde"
                    value={form.faction}
                    onChange={(e) => setForm((p) => ({ ...p, faction: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as NPCStatus }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {(Object.keys(STATUS_CONFIG) as NPCStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Beschreibung</label>
                <textarea
                  rows={3}
                  placeholder="Aussehen, Persönlichkeit, Hintergrund…"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* GM Notes */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">GM-Notizen (privat)</label>
                <textarea
                  rows={3}
                  placeholder="Geheime Pläne, Motivationen, Geheimnisse…"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Visible Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((p) => ({ ...p, is_visible_to_players: !p.is_visible_to_players }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_visible_to_players ? 'bg-amber-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_visible_to_players ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-zinc-300">Für Spieler sichtbar</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
                >
                  {saving ? 'Speichern…' : editingNPC ? 'Änderungen speichern' : 'NPC erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
