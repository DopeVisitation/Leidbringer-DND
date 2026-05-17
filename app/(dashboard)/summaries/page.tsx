'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookText, Calendar, MessageCircle, Heart, HeartCrack, Star, HelpCircle, Send, Trash2, Edit2, Save, X, Lock, Unlock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface Session {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  is_unlocked_for_summary?: boolean
}

interface Summary {
  id: string
  session_id: string
  gm_summary: string
  updated_at: string
}

type CommentType = 'comment' | 'liked' | 'disliked' | 'highlight' | 'question'

interface SummaryComment {
  id: string
  session_id: string
  user_id: string
  comment_type: CommentType
  body: string
  created_at: string
  user?: { username: string } | null
}

const COMMENT_TEMPLATES: { type: CommentType; label: string; icon: React.ReactNode; placeholder: string; bg: string; border: string; text: string }[] = [
  {
    type: 'comment',
    label: 'Kommentar',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    placeholder: 'Was möchtest du zur Session sagen?',
    bg: 'bg-zinc-800',
    border: 'border-zinc-700',
    text: 'text-zinc-100',
  },
  {
    type: 'liked',
    label: 'Mein Charakter mochte besonders…',
    icon: <Heart className="w-3.5 h-3.5" />,
    placeholder: 'Was hat deinem Charakter besonders gefallen?',
    bg: 'bg-pink-900/30',
    border: 'border-pink-700/60',
    text: 'text-pink-200',
  },
  {
    type: 'disliked',
    label: 'Meinem Charakter gefiel gar nicht…',
    icon: <HeartCrack className="w-3.5 h-3.5" />,
    placeholder: 'Was hat deinem Charakter gar nicht gefallen?',
    bg: 'bg-red-900/30',
    border: 'border-red-700/60',
    text: 'text-red-200',
  },
  {
    type: 'highlight',
    label: 'Highlight der Session',
    icon: <Star className="w-3.5 h-3.5" />,
    placeholder: 'Welcher Moment war für dich besonders?',
    bg: 'bg-amber-900/30',
    border: 'border-amber-700/60',
    text: 'text-amber-200',
  },
  {
    type: 'question',
    label: 'Offene Frage',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    placeholder: 'Was war für dich unklar?',
    bg: 'bg-blue-900/30',
    border: 'border-blue-700/60',
    text: 'text-blue-200',
  },
]

function templateFor(type: CommentType) {
  return COMMENT_TEMPLATES.find((t) => t.type === type) ?? COMMENT_TEMPLATES[0]
}

export default function SummariesPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [summaries, setSummaries] = useState<Record<string, Summary>>({})
  const [comments, setComments] = useState<Record<string, SummaryComment[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    // Only show confirmed sessions (is_confirmed = true). For GM: all confirmed. For players: also unlocked.
    const sessionQuery = isGM
      ? supabase.from('sessions').select('id,title,description,start_date,end_date,is_unlocked_for_summary,is_confirmed').eq('is_confirmed', true).order('start_date', { ascending: false })
      : supabase.from('sessions').select('id,title,description,start_date,end_date,is_unlocked_for_summary,is_confirmed').eq('is_confirmed', true).eq('is_unlocked_for_summary', true).order('start_date', { ascending: false })
    const [{ data: sess }, { data: sums }, { data: cmts }] = await Promise.all([
      sessionQuery,
      supabase.from('session_summaries').select('*'),
      supabase.from('session_summary_comments').select('*, user:profiles(username)').order('created_at', { ascending: true }),
    ])
    if (sess) setSessions(sess as Session[])
    if (sums) {
      const map: Record<string, Summary> = {}
      ;(sums as Summary[]).forEach((s) => { map[s.session_id] = s })
      setSummaries(map)
    }
    if (cmts) {
      const map: Record<string, SummaryComment[]> = {}
      ;(cmts as SummaryComment[]).forEach((c) => {
        if (!map[c.session_id]) map[c.session_id] = []
        map[c.session_id].push(c)
      })
      setComments(map)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll()
    const ch1 = supabase.channel('summaries_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_summaries' }, loadAll)
      .subscribe()
    const ch2 = supabase.channel('summary_comments_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_summary_comments' }, loadAll)
      .subscribe()
    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [loadAll, supabase])

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <BookText className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold text-zinc-100">Zusammenfassungen</h1>
        <span className="text-xs text-zinc-500 ml-1">{Object.keys(summaries).length} / {sessions.length} Sessions</span>
      </div>

      {loading && (
        <p className="text-center text-zinc-600 text-sm py-8">Lädt…</p>
      )}

      {!loading && sessions.length === 0 && (
        <p className="text-center text-zinc-600 text-sm py-8 border border-dashed border-zinc-800 rounded-xl">
          Noch keine Sessions angelegt.
        </p>
      )}

      <div className="space-y-3">
        {sessions.map((s) => {
          const summary = summaries[s.id]
          const sessionComments = comments[s.id] ?? []
          const isOpen = expandedSessionId === s.id
          return (
            <SessionSummaryCard
              key={s.id}
              session={s}
              summary={summary}
              comments={sessionComments}
              open={isOpen}
              onToggle={() => setExpandedSessionId(isOpen ? null : s.id)}
              isGM={isGM}
              currentUserId={user.id}
              onChanged={loadAll}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Session Summary Card ────────────────────────────────────────────────────
function SessionSummaryCard({
  session, summary, comments, open, onToggle, isGM, currentUserId, onChanged,
}: {
  session: Session
  summary: Summary | undefined
  comments: SummaryComment[]
  open: boolean
  onToggle: () => void
  isGM: boolean
  currentUserId: string
  onChanged: () => void
}) {
  const supabase = createClient()
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryText, setSummaryText] = useState(summary?.gm_summary ?? '')
  const [activeTemplate, setActiveTemplate] = useState<CommentType>('comment')
  const [commentBody, setCommentBody] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => { setSummaryText(summary?.gm_summary ?? '') }, [summary?.gm_summary])

  const saveSummary = async () => {
    if (summary) {
      await supabase.from('session_summaries')
        .update({ gm_summary: summaryText, updated_at: new Date().toISOString() })
        .eq('id', summary.id)
    } else {
      await supabase.from('session_summaries').insert({
        session_id: session.id,
        gm_summary: summaryText,
        created_by: currentUserId,
      })
    }
    setEditingSummary(false)
    onChanged()
  }

  const postComment = async () => {
    if (!commentBody.trim()) return
    setPosting(true)
    await supabase.from('session_summary_comments').insert({
      session_id: session.id,
      user_id: currentUserId,
      comment_type: activeTemplate,
      body: commentBody.trim(),
    })
    setCommentBody('')
    setPosting(false)
    onChanged()
  }

  const deleteComment = async (id: string) => {
    if (!confirm('Kommentar löschen?')) return
    await supabase.from('session_summary_comments').delete().eq('id', id)
    onChanged()
  }

  const dateStr = new Date(session.start_date).toLocaleDateString('de', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-100 truncate">{session.title}</p>
            <p className="text-xs text-zinc-500">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {summary
              ? <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/40 border border-emerald-700/40 text-emerald-300">Zusammenfassung ✓</span>
              : <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500">offen</span>
            }
            {comments.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/30 border border-amber-700/40 text-amber-300 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> {comments.length}
              </span>
            )}
            {/* Unlock badge */}
            {session.is_unlocked_for_summary
              ? <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 border border-blue-700/40 text-blue-300 flex items-center gap-1"><Unlock className="w-2.5 h-2.5" /> Sichtbar</span>
              : isGM && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700 text-zinc-500 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Gesperrt</span>
            }
          </div>
        </button>
        {/* GM unlock toggle */}
        {isGM && (
          <button
            onClick={async () => {
              await supabase.from('sessions').update({ is_unlocked_for_summary: !session.is_unlocked_for_summary }).eq('id', session.id)
              onChanged()
            }}
            title={session.is_unlocked_for_summary ? 'Für Spieler sperren' : 'Für Spieler freischalten'}
            className={`mr-3 p-2 rounded-lg border text-xs transition-colors ${
              session.is_unlocked_for_summary
                ? 'bg-blue-900/30 border-blue-700/40 text-blue-400 hover:bg-blue-900/60'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-blue-400 hover:border-blue-700/40'
            }`}
          >
            {session.is_unlocked_for_summary ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* GM-Zusammenfassung */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">GM-Zusammenfassung</p>
              {isGM && !editingSummary && (
                <button
                  onClick={() => setEditingSummary(true)}
                  className="text-xs text-zinc-400 hover:text-amber-400 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> {summary ? 'Bearbeiten' : 'Erstellen'}
                </button>
              )}
            </div>
            {editingSummary && isGM ? (
              <div className="space-y-2">
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  rows={8}
                  placeholder="Wie ist die Session verlaufen? Was haben die Spieler erlebt?"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSummary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    <Save className="w-3.5 h-3.5" /> Speichern
                  </button>
                  <button
                    onClick={() => { setEditingSummary(false); setSummaryText(summary?.gm_summary ?? '') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  >
                    <X className="w-3.5 h-3.5" /> Abbrechen
                  </button>
                </div>
              </div>
            ) : summary?.gm_summary ? (
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{summary.gm_summary}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Noch keine Zusammenfassung von der GM.</p>
            )}
          </div>

          {/* Kommentare */}
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">
              Kommentare der Gruppe ({comments.length})
            </p>
            {comments.length > 0 ? (
              <div className="space-y-2">
                {comments.map((c) => {
                  const tpl = templateFor(c.comment_type)
                  return (
                    <div
                      key={c.id}
                      className={`flex gap-2 px-3 py-2 rounded-lg border ${tpl.bg} ${tpl.border}`}
                    >
                      <div className={`mt-0.5 ${tpl.text}`}>{tpl.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${tpl.text}`}>{tpl.label}</span>
                          <span className="text-[10px] text-zinc-500">
                            — {c.user?.username ?? '?'} · {new Date(c.created_at).toLocaleString('de', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${tpl.text}`}>{c.body}</p>
                      </div>
                      {(isGM || c.user_id === currentUserId) && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="self-start text-zinc-500 hover:text-red-400"
                          title="Löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic mb-2">Noch keine Kommentare. Sei der/die Erste!</p>
            )}

            {/* Kommentar verfassen */}
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {COMMENT_TEMPLATES.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => setActiveTemplate(t.type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activeTemplate === t.type
                        ? `${t.bg} ${t.border} ${t.text} shadow-sm`
                        : 'bg-zinc-800/40 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={2}
                  placeholder={templateFor(activeTemplate).placeholder}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-y"
                />
                <button
                  onClick={postComment}
                  disabled={posting || !commentBody.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold self-start"
                >
                  <Send className="w-3.5 h-3.5" /> Senden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
