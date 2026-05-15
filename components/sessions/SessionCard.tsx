'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { MapPin, Monitor, Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { cn, getSessionColor, getSessionBadgeColor, countAccepted, formatDate, formatTime } from '@/lib/utils'
import type { Session, ResponseStatus, AttendanceType, User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface SessionCardProps {
  session: Session
  currentUser: User
  requiredPlayers?: number
}

const STATUS_OPTIONS: { value: ResponseStatus; label: string; emoji: string }[] = [
  { value: 'accepted', label: 'Zusage', emoji: '✅' },
  { value: 'maybe', label: 'Vielleicht', emoji: '🤔' },
  { value: 'declined', label: 'Absage', emoji: '❌' },
]

const ATTENDANCE_OPTIONS: { value: AttendanceType; label: string }[] = [
  { value: 'online', label: 'Nur Online' },
  { value: 'presence', label: 'Nur Präsenz' },
  { value: 'both', label: 'Beides möglich' },
]

export function SessionCard({ session, currentUser, requiredPlayers = 4 }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const responses = session.responses ?? []
  const accepted = countAccepted(responses)
  const myResponse = responses.find((r) => r.user_id === currentUser.id)
  const isGM = currentUser.role === 'gm'

  const handleResponse = async (status: ResponseStatus, attendanceType?: AttendanceType) => {
    setSaving(true)
    await supabase.from('session_responses').upsert({
      session_id: session.id,
      user_id: currentUser.id,
      status,
      attendance_type: attendanceType ?? myResponse?.attendance_type ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,user_id' })
    setSaving(false)
  }

  const cardColor = getSessionColor(accepted, requiredPlayers)
  const badgeColor = getSessionBadgeColor(accepted, requiredPlayers)

  return (
    <div className={cn('rounded-xl border-2 p-4 transition-all', cardColor)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', badgeColor)}>
              {accepted}/{requiredPlayers}
            </span>
            <span className="text-xs text-zinc-400 uppercase tracking-wider">
              {session.session_type === 'online' ? '🖥 Online' : session.session_type === 'presence' ? '🏠 Präsenz' : '🔀 Hybrid'}
            </span>
          </div>
          <h3 className="text-base font-bold text-zinc-100 mt-1 truncate">{session.title}</h3>
          <p className="text-sm text-zinc-400">
            {formatDate(session.start_date)} · {formatTime(session.start_date)} – {formatTime(session.end_date)}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0 mt-1"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Quick response for players */}
      {!isGM && (
        <div className="mt-3 flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleResponse(opt.value)}
              disabled={saving}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all border',
                myResponse?.status === opt.value
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-zinc-800/70 border-zinc-700 text-zinc-300 hover:border-zinc-500'
              )}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-zinc-700/50">
          {session.description && (
            <p className="text-sm text-zinc-300">{session.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {session.location}
              </span>
            )}
            {session.discord_link && (
              <a
                href={session.discord_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
              >
                <Monitor className="w-3 h-3" /> Discord <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Hybrid attendance choice */}
          {!isGM && session.session_type === 'hybrid' && myResponse?.status === 'accepted' && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Wie möchtest du teilnehmen?</p>
              <div className="flex gap-2 flex-wrap">
                {ATTENDANCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleResponse(myResponse.status, opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      myResponse.attendance_type === opt.value
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player responses list */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Antworten
            </p>
            <div className="space-y-1">
              {responses.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{r.user?.username ?? 'Spieler'}</span>
                  <span className={cn(
                    'font-medium',
                    r.status === 'accepted' ? 'text-emerald-400' :
                    r.status === 'maybe' ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {r.status === 'accepted' ? '✅ Dabei' : r.status === 'maybe' ? '🤔 Vielleicht' : '❌ Nein'}
                    {r.attendance_type && r.attendance_type !== null && (
                      <span className="text-zinc-500 ml-1">
                        ({r.attendance_type === 'online' ? 'Online' : r.attendance_type === 'presence' ? 'Präsenz' : 'Beides'})
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {responses.length === 0 && (
                <p className="text-zinc-600 text-xs">Noch keine Antworten</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
