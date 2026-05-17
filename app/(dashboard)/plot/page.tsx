'use client'

import { useState, useEffect, useCallback } from 'react'
import { GitBranch, Plus, X, Search, ChevronDown, ChevronUp, Pencil, Trash2, MessageSquare, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface PlotThread {
  id: string
  title: string
  description: string | null
  status: PlotStatus
  linked_npc_ids: string[]
  linked_quest_ids: string[]
  location: string | null
  is_gm_only: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

interface PlotTheory {
  id: string
  thread_id: string
  user_id: string
  theory: string
  created_at: string
}

interface NPC {
  id: string
  name: string
  emoji: string
}

interface Quest {
  id: string
  title: string
}

interface Profile {
  id: string
  username: string
}

type PlotStatus = 'open' | 'in_progress' | 'resolved'

const STATUS_CONFIG: Record<PlotStatus, { label: string; color: string; tab: string }> = {
  open:        { label: 'Offen',     color: 'text-amber-400 bg-amber-900/20 border-amber-800/50',     tab: 'bg-amber-600' },
  in_progress: { label: 'In Arbeit', color: 'text-blue-400 bg-blue-900/20 border-blue-800/50',        tab: 'bg-blue-600' },
  resolved:    { label: 'Gelöst',    color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800/50', tab: 'bg-emerald-600' },
}

const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'open' as PlotStatus,
  location: '',
  linked_npc_ids: [] as string[],
  linked_quest_ids: [] as string[],
  is_gm_only: false,
}

export default function PlotPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [threads, setThreads] = useState<PlotThread[]>([])
  const [theories, setTheories] = useState<PlotTheory[]>([])
  const [npcs, setNpcs] = useState<NPC[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<PlotStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingThread, setEditingThread] = useState<PlotThread | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [theoryInputs, setTheoryInputs] = useState<Record<string, string>>({})
  const [submittingTheory, setSubmittingTheory] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const [threadsRes, theoriesRes, npcsRes, questsRes, profilesRes] = await Promise.all([
      supabase.from('plot_threads').select('*').order('created_at', { ascending: false }),
      supabase.from('plot_theories').select('*').order('created_at', { ascending: true }),
      supabase.from('npcs').select('id, name, emoji').order('name'),
      supabase.from('quests').select('id, title').order('title'),
      supabase.from('profiles').select('id, username'),
    ])
    if (threadsRes.data)  setThreads(threadsRes.data as PlotThread[])
    if (theoriesRes.data) setTheories(theoriesRes.data as PlotTheory[])
    if (npcsRes.data)     setNpcs(npcsRes.data as NPC[])
    if (questsRes.data)   setQuests(questsRes.data as Quest[])
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('plot_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plot_threads' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plot_theories' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadAll])

  const openCreate = () => {
    setEditingThread(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (thread: PlotThread, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingThread(thread)
    setForm({
      title: thread.title,
      description: thread.description ?? '',
      status: thread.status,
      location: thread.location ?? '',
      linked_npc_ids: thread.linked_npc_ids ?? [],
      linked_quest_ids: thread.linked_quest_ids ?? [],
      is_gm_only: thread.is_gm_only,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingThread(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      location: form.location.trim() || null,
      linked_npc_ids: form.linked_npc_ids,
      linked_quest_ids: form.linked_quest_ids,
      is_gm_only: form.is_gm_only,
      updated_at: new Date().toISOString(),
    }

    if (editingThread) {
      await supabase.from('plot_threads').update(payload).eq('id', editingThread.id)
    } else {
      await supabase.from('plot_threads').insert({ ...payload, created_by: user.id })
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
    await supabase.from('plot_threads').delete().eq('id', id)
    setDeleteConfirmId(null)
    if (expandedId === id) setExpandedId(null)
  }

  const handleStatusChange = async (id: string, status: PlotStatus) => {
    await supabase.from('plot_threads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const handleDeleteTheory = async (theoryId: string) => {
    await supabase.from('plot_theories').delete().eq('id', theoryId)
  }

  const handleSubmitTheory = async (threadId: string) => {
    const text = (theoryInputs[threadId] ?? '').trim()
    if (!text || !user) return
    setSubmittingTheory(threadId)
    await supabase.from('plot_theories').insert({
      thread_id: threadId,
      user_id: user.id,
      theory: text,
    })
    setTheoryInputs((p) => ({ ...p, [threadId]: '' }))
    setSubmittingTheory(null)
  }

  const toggleNpcLink = (id: string) => {
    setForm((p) => ({
      ...p,
      linked_npc_ids: p.linked_npc_ids.includes(id)
        ? p.linked_npc_ids.filter((x) => x !== id)
        : [...p.linked_npc_ids, id],
    }))
  }

  const toggleQuestLink = (id: string) => {
    setForm((p) => ({
      ...p,
      linked_quest_ids: p.linked_quest_ids.includes(id)
        ? p.linked_quest_ids.filter((x) => x !== id)
        : [...p.linked_quest_ids, id],
    }))
  }

  const getProfile = (uid: string) => profiles.find((p) => p.id === uid)
  const getNPC     = (id: string)  => npcs.find((n) => n.id === id)
  const getQuest   = (id: string)  => quests.find((q) => q.id === id)

  const filtered = threads.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || t.title.toLowerCase().includes(q)
      || (t.description ?? '').toLowerCase().includes(q)
      || (t.location ?? '').toLowerCase().includes(q)
    const matchStatus = statusTab === 'all' || t.status === statusTab
    return matchSearch && matchStatus
  })

  const grouped: Record<PlotStatus, PlotThread[]> = {
    open:        filtered.filter((t) => t.status === 'open'),
    in_progress: filtered.filter((t) => t.status === 'in_progress'),
    resolved:    filtered.filter((t) => t.status === 'resolved'),
  }

  const orderedStatuses: PlotStatus[] = ['open', 'in_progress', 'resolved']

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Plot Tracker</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{threads.length}</span>
        </div>
        {isGM && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Faden erstellen
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Titel, Beschreibung oder Ort suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', ...orderedStatuses] as const).map((s) => {
          const isActive = statusTab === s
          const cfg = s !== 'all' ? STATUS_CONFIG[s] : null
          return (
            <button
              key={s}
              onClick={() => setStatusTab(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? s === 'all' ? 'bg-zinc-600 text-white' : `${cfg!.tab} text-white`
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {s === 'all' ? 'Alle' : STATUS_CONFIG[s].label}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-70">{threads.filter((t) => t.status === s).length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-zinc-600 py-16">
          <p className="text-sm">Wird geladen…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-600 py-16">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search || statusTab !== 'all' ? 'Keine Fäden gefunden.' : 'Noch keine Plot-Fäden angelegt.'}</p>
          {isGM && !search && statusTab === 'all' && (
            <button onClick={openCreate} className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline">
              Ersten Faden erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {(statusTab === 'all' ? orderedStatuses : [statusTab as PlotStatus]).map((status) => {
            const group = grouped[status]
            if (group.length === 0) return null
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.tab}`} />
                  <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{cfg.label}</h2>
                  <span className="text-xs text-zinc-600">({group.length})</span>
                </div>

                {group.map((thread) => {
                  const isExpanded = expandedId === thread.id
                  const statusCfg = STATUS_CONFIG[thread.status]
                  const threadTheories = theories.filter((t) => t.thread_id === thread.id)
                  const linkedNPCs = (thread.linked_npc_ids ?? []).map(getNPC).filter(Boolean) as NPC[]
                  const linkedQuests = (thread.linked_quest_ids ?? []).map(getQuest).filter(Boolean) as Quest[]

                  return (
                    <div key={thread.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                      {/* Card Header */}
                      <button
                        className="w-full text-left p-4 hover:bg-zinc-800/40 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : thread.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-zinc-100">{thread.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                              {thread.is_gm_only && (
                                <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500 bg-zinc-800/50">
                                  Nur GM
                                </span>
                              )}
                            </div>

                            {thread.location && (
                              <p className="text-xs text-zinc-500 mb-1.5">{thread.location}</p>
                            )}

                            {/* Linked NPCs + Quests preview */}
                            {(linkedNPCs.length > 0 || linkedQuests.length > 0) && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {linkedNPCs.map((npc) => (
                                  <span key={npc.id} className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full px-2 py-0.5">
                                    {npc.emoji} {npc.name}
                                  </span>
                                ))}
                                {linkedQuests.map((q) => (
                                  <span key={q.id} className="text-xs bg-zinc-800 border border-amber-900/40 text-amber-500/80 rounded-full px-2 py-0.5">
                                    ⚔️ {q.title}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {threadTheories.length > 0 && (
                              <span className="text-xs text-zinc-500 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {threadTheories.length}
                              </span>
                            )}
                            {isGM && (
                              <>
                                <button
                                  onClick={(e) => openEdit(thread, e)}
                                  className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700 transition-colors ml-1"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(thread.id, e)}
                                  className={`p-1.5 rounded transition-colors ${
                                    deleteConfirmId === thread.id
                                      ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40'
                                      : 'text-zinc-600 hover:text-red-400 hover:bg-zinc-700'
                                  }`}
                                  title={deleteConfirmId === thread.id ? 'Nochmal klicken zum Bestätigen' : 'Löschen'}
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
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-zinc-800">
                          <div className="p-4 space-y-4">
                            {/* Description */}
                            {thread.description && (
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{thread.description}</p>
                            )}

                            {/* GM Status Change */}
                            {isGM && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">Status:</span>
                                <select
                                  value={thread.status}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleStatusChange(thread.id, e.target.value as PlotStatus)}
                                  className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-amber-500"
                                >
                                  {orderedStatuses.map((s) => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Theories Section */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Theorien ({threadTheories.length})
                              </p>

                              {threadTheories.length === 0 && (
                                <p className="text-xs text-zinc-600 italic">Noch keine Theorien. Sei der Erste!</p>
                              )}

                              <div className="space-y-2">
                                {threadTheories.map((theory) => {
                                  const author = getProfile(theory.user_id)
                                  const isOwn = theory.user_id === user.id
                                  return (
                                    <div
                                      key={theory.id}
                                      className={`rounded-lg px-3 py-2.5 text-sm ${
                                        isOwn
                                          ? 'bg-amber-900/20 border border-amber-800/30'
                                          : 'bg-zinc-800 border border-zinc-700'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <span className="text-xs font-medium text-zinc-400 mr-2">
                                            {author?.username ?? 'Unbekannt'}
                                            {isOwn && <span className="text-amber-500 ml-1">(Du)</span>}
                                          </span>
                                          <p className="text-zinc-300 mt-0.5 whitespace-pre-wrap">{theory.theory}</p>
                                        </div>
                                        {(isGM || isOwn) && (
                                          <button
                                            onClick={() => handleDeleteTheory(theory.id)}
                                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-700 transition-colors flex-shrink-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-xs text-zinc-600 mt-1">
                                        {new Date(theory.created_at).toLocaleDateString('de-DE', {
                                          day: '2-digit', month: '2-digit', year: 'numeric',
                                          hour: '2-digit', minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Theory Input */}
                              <div className="flex gap-2 mt-3">
                                <input
                                  type="text"
                                  placeholder="Deine Theorie…"
                                  value={theoryInputs[thread.id] ?? ''}
                                  onChange={(e) => setTheoryInputs((p) => ({ ...p, [thread.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      handleSubmitTheory(thread.id)
                                    }
                                  }}
                                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                                />
                                <button
                                  onClick={() => handleSubmitTheory(thread.id)}
                                  disabled={submittingTheory === thread.id || !(theoryInputs[thread.id] ?? '').trim()}
                                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && isGM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-base font-bold text-zinc-100">
                {editingThread ? 'Faden bearbeiten' : 'Neuen Faden erstellen'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Titel *</label>
                <input
                  type="text"
                  required
                  placeholder="Name des Plot-Fadens"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Beschreibung</label>
                <textarea
                  rows={3}
                  placeholder="Was ist der Plot-Faden? Hintergründe, Kontext…"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Status + Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as PlotStatus }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {orderedStatuses.map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ort</label>
                  <input
                    type="text"
                    placeholder="z.B. Neverwinter"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Linked NPCs */}
              {npcs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Verknüpfte NPCs</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {npcs.map((npc) => {
                      const selected = form.linked_npc_ids.includes(npc.id)
                      return (
                        <button
                          key={npc.id}
                          type="button"
                          onClick={() => toggleNpcLink(npc.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            selected
                              ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          {npc.emoji} {npc.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Linked Quests */}
              {quests.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Verknüpfte Quests</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                    {quests.map((quest) => {
                      const selected = form.linked_quest_ids.includes(quest.id)
                      return (
                        <button
                          key={quest.id}
                          type="button"
                          onClick={() => toggleQuestLink(quest.id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            selected
                              ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                          }`}
                        >
                          ⚔️ {quest.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* GM Only Toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((p) => ({ ...p, is_gm_only: !p.is_gm_only }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.is_gm_only ? 'bg-amber-600' : 'bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_gm_only ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-zinc-300">Nur für GM sichtbar</span>
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
                  {saving ? 'Speichern…' : editingThread ? 'Änderungen speichern' : 'Faden erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
