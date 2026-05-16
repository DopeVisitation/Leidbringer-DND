'use client'

import { useState } from 'react'
import { MapPin, Monitor, Users, ChevronDown, ChevronUp, ExternalLink, Trash2, Edit2, Save, X } from 'lucide-react'
import { cn, getSessionColor, getSessionBadgeColor, countAccepted, formatDate, formatTime } from '@/lib/utils'
import type { Session, ResponseStatus, AttendanceType, User, SessionType } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface SessionCardProps {
  session: Session
  currentUser: User
  requiredPlayers?: number
  onDeleted?: () => void
}

const STATUS_OPTIONS: { value: ResponseStatus; label: string; emoji: string }[] = [
  { value: 'accepted', label: 'Zusage', emoji: '✅' },
  { value: 'maybe',    label: 'Vielleicht', emoji: '🤔' },
  { value: 'declined', label: 'Absage',  emoji: '❌' },
]

const ATTENDANCE_OPTIONS: { value: AttendanceType; label: string }[] = [
  { value: 'online',   label: 'Nur Online'    },
  { value: 'presence', label: 'Nur Präsenz'   },
  { value: 'both',     label: 'Beides möglich'},
]

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'online',   label: '🖥 Online'   },
  { value: 'presence', label: '🏠 Präsenz'  },
  { value: 'hybrid',   label: '🔀 Hybrid'   },
]

function toLocalDatetime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SessionCard({ session, currentUser, requiredPlayers = 4, onDeleted }: SessionCardProps) {
  const [expanded, setExpanded]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editMode, setEditMode]         = useState(false)
  const [editSaving, setEditSaving]     = useState(false)

  // Edit form state (pre-filled from session)
  const [editTitle, setEditTitle]           = useState(session.title)
  const [editDescription, setEditDesc]      = useState(session.description ?? '')
  const [editStartDate, setEditStartDate]   = useState(toLocalDatetime(session.start_date))
  const [editEndDate, setEditEndDate]       = useState(toLocalDatetime(session.end_date))
  const [editType, setEditType]             = useState<SessionType>(session.session_type)
  const [editLocation, setEditLocation]     = useState(session.location ?? '')
  const [editDiscord, setEditDiscord]       = useState(session.discord_link ?? '')

  const supabase  = createClient()
  const responses = session.responses ?? []
  const accepted  = countAccepted(responses)
  const myResponse = responses.find((r) => r.user_id === currentUser.id)
  const isGM = currentUser.role === 'gm'

  const handleDelete = async () => {
    await supabase.from('sessions').delete().eq('id', session.id)
    onDeleted?.()
  }

  const handleSaveEdit = async () => {
    setEditSaving(true)
    await supabase.from('sessions').update({
      title:        editTitle.trim() || session.title,
      description:  editDescription.trim() || null,
      start_date:   new Date(editStartDate).toISOString(),
      end_date:     new Date(editEndDate).toISOString(),
      session_type: editType,
      location:     editLocation.trim() || null,
      discord_link: editDiscord.trim() || null,
    }).eq('id', session.id)
    setEditSaving(false)
    setEditMode(false)
    onDeleted?.()   // reuse refetch callback
  }

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

  const cardColor  = getSessionColor(accepted, requiredPlayers)
  const badgeColor = getSessionBadgeColor(accepted, requiredPlayers)

  if (editMode && isGM) {
    return (
      <div className="rounded-xl border-2 border-amber-600/40 bg-amber-950/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-amber-400">Session bearbeiten</p>
          <button onClick={() => setEditMode(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2">
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            placeholder="Titel" value={editTitle} onChange={e => setEditTitle(e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 block mb-0.5">Start</label>
              <input type="datetime-local" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-0.5">Ende</label>
              <input type="datetime-local" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            {SESSION_TYPES.map(t => (
              <button key={t.value} onClick={() => setEditType(t.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${editType === t.value ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <textarea rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Beschreibung…" value={editDescription} onChange={e => setEditDesc(e.target.value)} />

          {editType !== 'online' && (
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Ort" value={editLocation} onChange={e => setEditLocation(e.target.value)} />
          )}
          {editType !== 'presence' && (
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              placeholder="Discord-Link" value={editDiscord} onChange={e => setEditDiscord(e.target.value)} />
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setEditMode(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">Abbrechen</button>
          <button onClick={handleSaveEdit} disabled={editSaving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold text-white">
            <Save className="w-3.5 h-3.5" /> {editSaving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          {isGM && (
            <>
              <button onClick={() => setEditMode(true)}
                className="p-1.5 text-zinc-600 hover:text-amber-400 transition-colors" title="Session bearbeiten">
                <Edit2 className="w-4 h-4" />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} className="text-xs px-2 py-1 rounded bg-red-600 text-white font-medium">Löschen</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">Nein</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" title="Session löschen">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Quick response for players */}
      {!isGM && (
        <div className="mt-3 flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => handleResponse(opt.value)} disabled={saving}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all border',
                myResponse?.status === opt.value
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-zinc-800/70 border-zinc-700 text-zinc-300 hover:border-zinc-500'
              )}>
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-zinc-700/50">
          {session.description && <p className="text-sm text-zinc-300">{session.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {session.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</span>
            )}
            {session.discord_link && (
              <a href={session.discord_link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                <Monitor className="w-3 h-3" /> Discord <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Hybrid attendance */}
          {!isGM && session.session_type === 'hybrid' && myResponse?.status === 'accepted' && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Wie möchtest du teilnehmen?</p>
              <div className="flex gap-2 flex-wrap">
                {ATTENDANCE_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => handleResponse(myResponse.status, opt.value)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      myResponse.attendance_type === opt.value
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Responses list */}
          <div>
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Antworten</p>
            <div className="space-y-1">
              {responses.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{r.user?.username ?? 'Spieler'}</span>
                  <span className={cn('font-medium',
                    r.status === 'accepted' ? 'text-emerald-400' : r.status === 'maybe' ? 'text-yellow-400' : 'text-red-400')}>
                    {r.status === 'accepted' ? '✅ Dabei' : r.status === 'maybe' ? '🤔 Vielleicht' : '❌ Nein'}
                    {r.attendance_type && <span className="text-zinc-500 ml-1">({r.attendance_type === 'online' ? 'Online' : r.attendance_type === 'presence' ? 'Präsenz' : 'Beides'})</span>}
                  </span>
                </div>
              ))}
              {responses.length === 0 && <p className="text-zinc-600 text-xs">Noch keine Antworten</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
