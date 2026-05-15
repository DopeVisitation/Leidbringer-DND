'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Save, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, MessageSquare, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User, SessionSummary, SessionPlayerFeedback } from '@/types'

interface Props {
  sessionId: string
  currentUser: User
  isGM: boolean
}

export function SessionSummarySection({ sessionId, currentUser, isGM }: Props) {
  const supabase = createClient()
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [feedbacks, setFeedbacks] = useState<SessionPlayerFeedback[]>([])
  const [gmText, setGmText] = useState('')
  const [myFeedback, setMyFeedback] = useState({ feedback_text: '', character_liked: '', character_disliked: '' })
  const [savingGM, setSavingGM] = useState(false)
  const [savingFeedback, setSavingFeedback] = useState(false)
  const [showFeedbacks, setShowFeedbacks] = useState(false)
  const [dbError, setDbError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadData() }, [sessionId])

  const loadData = async () => {
    try {
      const [sumRes, fbRes] = await Promise.all([
        supabase.from('session_summaries').select('*').eq('session_id', sessionId).maybeSingle(),
        supabase.from('session_player_feedback').select('*, user:profiles(id,username,role)').eq('session_id', sessionId),
      ])

      if (sumRes.error?.message?.includes('does not exist') || fbRes.error?.message?.includes('does not exist')) {
        setDbError(true)
        setLoaded(true)
        return
      }

      if (sumRes.data) { setSummary(sumRes.data); setGmText(sumRes.data.gm_summary) }
      if (fbRes.data) {
        setFeedbacks(fbRes.data as SessionPlayerFeedback[])
        const mine = fbRes.data.find((f: SessionPlayerFeedback) => f.user_id === currentUser.id)
        if (mine) setMyFeedback({ feedback_text: mine.feedback_text, character_liked: mine.character_liked ?? '', character_disliked: mine.character_disliked ?? '' })
      }
    } catch {
      setDbError(true)
    }
    setLoaded(true)
  }

  const saveGMSummary = async () => {
    setSavingGM(true)
    if (summary) {
      await supabase.from('session_summaries').update({ gm_summary: gmText, updated_at: new Date().toISOString() }).eq('id', summary.id)
    } else {
      const { data } = await supabase.from('session_summaries').insert({ session_id: sessionId, gm_summary: gmText, created_by: currentUser.id }).select().single()
      if (data) setSummary(data)
    }
    setSavingGM(false)
  }

  const savePlayerFeedback = async () => {
    setSavingFeedback(true)
    const existing = feedbacks.find((f) => f.user_id === currentUser.id)
    if (existing) {
      await supabase.from('session_player_feedback').update({ ...myFeedback, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('session_player_feedback').insert({ session_id: sessionId, user_id: currentUser.id, ...myFeedback })
    }
    await loadData()
    setSavingFeedback(false)
  }

  if (!loaded) return <div className="h-24 rounded-xl bg-zinc-800/40 animate-pulse" />

  if (dbError) return (
    <div className="flex items-start gap-3 bg-amber-900/10 border border-amber-800/30 rounded-xl px-4 py-3">
      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-300">
        <p className="font-medium">Tabellen fehlen</p>
        <p className="text-amber-400 text-xs mt-1">Bitte führe <code>schema_v2.sql</code> im Supabase SQL Editor aus, damit die Zusammenfassungs-Funktion funktioniert.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* GM Zusammenfassung */}
      {isGM ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">GM-Zusammenfassung</h3>
          </div>
          <textarea
            rows={5} value={gmText}
            onChange={(e) => setGmText(e.target.value)}
            placeholder="Was ist in dieser Session passiert? Schreibe eine Zusammenfassung für alle..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
          />

          {feedbacks.length > 0 && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-zinc-400">Spieler-Feedback als Inspiration:</p>
              {feedbacks.map((f) => (
                <div key={f.id} className="text-xs text-zinc-400 space-y-0.5">
                  <span className="font-medium text-zinc-300">{(f.user as any)?.username ?? '?'}: </span>
                  {f.feedback_text && <span>{f.feedback_text} </span>}
                  {f.character_liked && <span className="text-green-400">✓ {f.character_liked} </span>}
                  {f.character_disliked && <span className="text-red-400">✗ {f.character_disliked}</span>}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={saveGMSummary} disabled={savingGM}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {savingGM ? 'Speichern...' : 'Zusammenfassung speichern'}
          </button>
        </div>
      ) : summary?.gm_summary ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Session-Zusammenfassung</h3>
          </div>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{summary.gm_summary}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-zinc-600" />
            <h3 className="text-sm font-semibold text-zinc-500">Session-Zusammenfassung</h3>
          </div>
          <p className="text-xs text-zinc-600">Der GM hat noch keine Zusammenfassung geschrieben.</p>
        </div>
      )}

      {/* Spieler-Feedback */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Dein Feedback</h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Kurzes Feedback (1–2 Sätze)</label>
          <textarea
            rows={2} value={myFeedback.feedback_text}
            onChange={(e) => setMyFeedback((p) => ({ ...p, feedback_text: e.target.value }))}
            placeholder="Wie war die Session für dich?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-green-400 mb-1">
              <ThumbsUp className="w-3.5 h-3.5" /> Was hat deinem Charakter gefallen?
            </label>
            <input
              type="text" value={myFeedback.character_liked}
              onChange={(e) => setMyFeedback((p) => ({ ...p, character_liked: e.target.value }))}
              placeholder="z.B. der Kampf mit dem Drachen"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-1">
              <ThumbsDown className="w-3.5 h-3.5" /> Was hat deinem Charakter nicht gefallen?
            </label>
            <input
              type="text" value={myFeedback.character_disliked}
              onChange={(e) => setMyFeedback((p) => ({ ...p, character_disliked: e.target.value }))}
              placeholder="z.B. der Verrat des NPCs"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <button
          onClick={savePlayerFeedback} disabled={savingFeedback}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm font-medium text-zinc-200 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          {savingFeedback ? 'Speichern...' : 'Feedback speichern'}
        </button>
      </div>

      {/* Alle Feedbacks */}
      {feedbacks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFeedbacks(!showFeedbacks)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <span>Alle Feedbacks ({feedbacks.length})</span>
            {showFeedbacks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showFeedbacks && (
            <div className="divide-y divide-zinc-800">
              {feedbacks.map((f) => (
                <div key={f.id} className="px-4 py-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-400">{(f.user as any)?.username ?? '?'}</p>
                  {f.feedback_text && <p className="text-sm text-zinc-300">{f.feedback_text}</p>}
                  <div className="flex gap-4 text-xs">
                    {f.character_liked && <span className="text-green-400">✓ {f.character_liked}</span>}
                    {f.character_disliked && <span className="text-red-400">✗ {f.character_disliked}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
