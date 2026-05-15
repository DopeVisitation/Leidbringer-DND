'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSession } from '@/lib/hooks/useSessions'
import { SessionCard } from '@/components/sessions/SessionCard'
import { SessionSummarySection } from '@/components/sessions/SessionSummary'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isGM } = useAuth()
  const { session, loading } = useSession(params.id as string)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Session wirklich löschen?')) return
    await supabase.from('sessions').delete().eq('id', params.id)
    router.push('/sessions')
  }

  if (!user) return null
  if (loading) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="h-64 rounded-xl bg-zinc-800/50 animate-pulse" />
    </div>
  )
  if (!session) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto text-center text-zinc-500 py-20">
      Session nicht gefunden.
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück
        </button>
        {isGM && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Löschen
          </button>
        )}
      </div>

      <div>
        <h1 className="text-xl font-bold text-zinc-100">{session.title}</h1>
        <p className="text-sm text-zinc-400">
          {formatDate(session.start_date)} · {formatTime(session.start_date)} – {formatTime(session.end_date)}
        </p>
      </div>

      <SessionCard session={session} currentUser={user} />

      <div className="pt-2">
        <h2 className="text-base font-semibold text-zinc-200 mb-3">Zusammenfassung & Feedback</h2>
        <SessionSummarySection sessionId={session.id} currentUser={user} isGM={isGM} />
      </div>
    </div>
  )
}
