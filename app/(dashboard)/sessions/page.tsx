'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSessions } from '@/lib/hooks/useSessions'
import { SessionCard } from '@/components/sessions/SessionCard'
import { SessionForm } from '@/components/sessions/SessionForm'

export default function SessionsPage() {
  const { user, isGM } = useAuth()
  const { sessions, loading, refetch } = useSessions()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')

  if (!user) return null

  const now = new Date()
  const filtered = sessions.filter((s) =>
    filter === 'upcoming'
      ? new Date(s.start_date) >= now
      : new Date(s.start_date) < now
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Sessions</h1>
          <p className="text-sm text-zinc-400">Alle Termine auf einen Blick</p>
        </div>
        {isGM && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Schließen' : 'Neue Session'}
          </button>
        )}
      </div>

      {showForm && isGM && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Session erstellen</h2>
          <SessionForm
            currentUser={user}
            onSuccess={() => { setShowForm(false); refetch() }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'upcoming' ? '📅 Kommende' : '📖 Vergangene'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-lg mb-1">Keine Sessions</p>
          <p className="text-sm">
            {filter === 'upcoming'
              ? isGM ? 'Erstelle eine neue Session oben.' : 'Der GM hat noch keine Sessions geplant.'
              : 'Noch keine vergangenen Sessions.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            currentUser={user}
            onDeleted={refetch}
          />
        ))}
      </div>
    </div>
  )
}
