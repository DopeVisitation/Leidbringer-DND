'use client'

import { useState, useEffect } from 'react'
import { Map, Plus, X, CheckCircle, XCircle, Star, ChevronDown, ChevronUp, Crown, Sword } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Quest, QuestRating, QuestStatus } from '@/types'

const STATUS_CONFIG: Record<QuestStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: 'Aktiv',       color: 'text-green-400 bg-green-900/20 border-green-800/50',    icon: Star },
  completed: { label: 'Abgeschlossen', color: 'text-blue-400 bg-blue-900/20 border-blue-800/50',   icon: CheckCircle },
  failed:    { label: 'Fehlgeschlagen', color: 'text-red-400 bg-red-900/20 border-red-800/50',       icon: XCircle },
}

function StarRating({ value, onChange, color = 'text-amber-400' }: { value: number; onChange?: (v: number) => void; color?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`w-5 h-5 transition-colors ${n <= value ? color : 'text-zinc-700'} ${onChange ? 'hover:scale-110' : 'cursor-default'}`}
        >
          <Star className="w-full h-full" fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function avgRating(ratings: QuestRating[], key: 'player_interest' | 'character_interest'): number {
  if (!ratings.length) return 0
  return ratings.reduce((s, r) => s + r[key], 0) / ratings.length
}

function QuestCard({ quest, currentUser, isGM, onStatusChange }: {
  quest: Quest & { ratings: QuestRating[] }
  currentUser: { id: string }
  isGM: boolean
  onStatusChange: (id: string, status: QuestStatus) => void
}) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [myRating, setMyRating] = useState<{ player_interest: number; character_interest: number }>(() => {
    const mine = quest.ratings.find((r) => r.user_id === currentUser.id)
    return { player_interest: mine?.player_interest ?? 0, character_interest: mine?.character_interest ?? 0 }
  })
  const [savingRating, setSavingRating] = useState(false)

  const saveRating = async (field: 'player_interest' | 'character_interest', val: number) => {
    const newRating = { ...myRating, [field]: val }
    setMyRating(newRating)
    if (!newRating.player_interest || !newRating.character_interest) return
    setSavingRating(true)
    const existing = quest.ratings.find((r) => r.user_id === currentUser.id)
    if (existing) {
      await supabase.from('quest_ratings').update({ ...newRating, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('quest_ratings').insert({ quest_id: quest.id, user_id: currentUser.id, ...newRating })
    }
    setSavingRating(false)
  }

  const avgPlayer    = avgRating(quest.ratings, 'player_interest')
  const avgCharacter = avgRating(quest.ratings, 'character_interest')
  const ratingCount  = quest.ratings.length
  const statusCfg    = STATUS_CONFIG[quest.status]
  const StatusIcon   = statusCfg.icon

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${quest.type === 'main' ? 'border-amber-700/50' : 'border-zinc-800'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {quest.type === 'main'
              ? <Crown className="w-4 h-4 text-amber-400" />
              : <Sword className="w-4 h-4 text-zinc-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-zinc-100">{quest.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {quest.type === 'main' ? 'Hauptquest' : `Nebenquest von ${(quest.creator as any)?.username ?? '?'}`}
                </p>
              </div>
              {isGM && (
                <select
                  value={quest.status}
                  onChange={(e) => onStatusChange(quest.id, e.target.value as QuestStatus)}
                  className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Aktiv</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="failed">Fehlgeschlagen</option>
                </select>
              )}
            </div>

            {/* Durchschnittsbewertungen */}
            {ratingCount > 0 && (
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Spieler:</span>
                  <StarRating value={Math.round(avgPlayer)} color="text-blue-400" />
                  <span className="text-xs text-zinc-600">({avgPlayer.toFixed(1)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Charakter:</span>
                  <StarRating value={Math.round(avgCharacter)} color="text-amber-400" />
                  <span className="text-xs text-zinc-600">({avgCharacter.toFixed(1)})</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between border-t border-zinc-800 text-xs text-zinc-500 hover:bg-zinc-800 transition-colors"
      >
        <span>{expanded ? 'Weniger anzeigen' : 'Beschreibung & Bewertung'}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-3">
          {quest.description && (
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{quest.description}</p>
          )}

          {/* Eigene Bewertung */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">Deine Bewertung</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-blue-400 font-medium">Als Spieler</p>
                <StarRating value={myRating.player_interest} onChange={(v) => saveRating('player_interest', v)} color="text-blue-400" />
                <p className="text-xs text-zinc-600">Wie sehr interessiert dich diese Quest als Spieler?</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 space-y-1.5">
                <p className="text-xs text-amber-400 font-medium">Als Charakter</p>
                <StarRating value={myRating.character_interest} onChange={(v) => saveRating('character_interest', v)} color="text-amber-400" />
                <p className="text-xs text-zinc-600">Würde dein Charakter diese Quest verfolgen?</p>
              </div>
            </div>
            {savingRating && <p className="text-xs text-zinc-500">Speichern...</p>}
          </div>

          {/* Alle Bewertungen (für GM) */}
          {isGM && quest.ratings.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-400">{quest.ratings.length} Bewertung(en)</p>
              {quest.ratings.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="w-20 truncate">{(r.user as any)?.username ?? '?'}</span>
                  <span className="text-blue-400">Spieler: {r.player_interest}/5</span>
                  <span className="text-amber-400">Charakter: {r.character_interest}/5</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function QuestsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()
  const [quests, setQuests] = useState<(Quest & { ratings: QuestRating[] })[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'side' as 'main' | 'side' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<QuestStatus | 'all'>('active')

  useEffect(() => {
    loadQuests()
    const channel = supabase
      .channel('quests_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, loadQuests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_ratings' }, loadQuests)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadQuests = async () => {
    const { data } = await supabase
      .from('quests')
      .select('*, creator:profiles!quests_created_by_fkey(id,username), ratings:quest_ratings(*, user:profiles(id,username))')
      .order('type', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setQuests(data as (Quest & { ratings: QuestRating[] })[])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('quests').insert({
      title: form.title,
      description: form.description || null,
      type: form.type,
      created_by: user.id,
    })
    setForm({ title: '', description: '', type: 'side' })
    setShowForm(false)
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: QuestStatus) => {
    await supabase.from('quests').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const filtered = filter === 'all' ? quests : quests.filter((q) => q.status === filter)
  const mainQuests = filtered.filter((q) => q.type === 'main')
  const sideQuests = filtered.filter((q) => q.type === 'side')

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Quests</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Quest erstellen
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Neue Quest</p>
            <button onClick={() => setShowForm(false)} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Quest-Titel *"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <textarea
              rows={3}
              placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            {isGM && (
              <div className="grid grid-cols-2 gap-2">
                {(['main', 'side'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: t }))}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${form.type === t ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                  >
                    {t === 'main' ? <Crown className="w-4 h-4" /> : <Sword className="w-4 h-4" />}
                    {t === 'main' ? 'Hauptquest' : 'Nebenquest'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-bold text-white transition-colors"
            >
              {saving ? 'Wird erstellt...' : 'Quest erstellen'}
            </button>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'completed', 'failed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            {f === 'all' ? 'Alle' : STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Hauptquests */}
      {mainQuests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">Hauptquests</h2>
          </div>
          {mainQuests.map((q) => (
            <QuestCard key={q.id} quest={q} currentUser={user} isGM={isGM} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Nebenquests */}
      {sideQuests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sword className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">Nebenquests</h2>
          </div>
          {sideQuests.map((q) => (
            <QuestCard key={q.id} quest={q} currentUser={user} isGM={isGM} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center text-zinc-600 py-16">
          <Map className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine Quests gefunden.</p>
        </div>
      )}
    </div>
  )
}
