'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Bell, Check, X, Plus, Clock, CheckCircle, XCircle,
  Package, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react'

type RequestStatus = 'pending' | 'approved' | 'rejected'
type RequestType  = 'item_price' | 'general'

interface ItemData {
  name: string
  rarity: string
  price_gp: number
  note: string | null
}

interface ApprovalRequest {
  id: string
  created_at: string
  requester_id: string
  target_id: string | null
  request_type: RequestType
  title: string
  content: string | null
  status: RequestStatus
  item_data: ItemData | null
  reviewer_id: string | null
  reviewed_at: string | null
  review_note: string | null
  requester?: { username: string; avatar_emoji?: string | null }
  reviewer?: { username: string } | null
  target?: { username: string } | null
}

interface Profile {
  id: string
  username: string
  avatar_emoji?: string | null
  role: string
}

const RARITY_COLORS: Record<string, string> = {
  common:    'text-zinc-300',
  uncommon:  'text-green-400',
  rare:      'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-amber-400',
  artifact:  'text-red-400',
}
const RARITY_LABELS: Record<string, string> = {
  common:    'Gewöhnlich',
  uncommon:  'Ungewöhnlich',
  rare:      'Selten',
  very_rare: 'Sehr Selten',
  legendary: 'Legendär',
  artifact:  'Artefakt',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtGp(n: number) {
  return n >= 1000 ? `${(n / 1000).toLocaleString('de', { maximumFractionDigits: 1 })}k gp` : `${n.toLocaleString('de')} gp`
}

type TabGM     = 'pending' | 'history'
type TabPlayer = 'mine' | 'new'

export default function ApprovalsPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [requests, setRequests]     = useState<ApprovalRequest[]>([])
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [loading, setLoading]       = useState(true)

  // GM tabs
  const [gmTab, setGmTab]           = useState<TabGM>('pending')
  // Player tabs
  const [playerTab, setPlayerTab]   = useState<TabPlayer>('mine')

  // New general-request form
  const [showForm, setShowForm]     = useState(false)
  const [formTitle, setFormTitle]   = useState('')
  const [formContent, setFormContent] = useState('')
  const [formTarget, setFormTarget] = useState<string>('gm') // 'gm' | player-id

  // Review-note modal
  const [reviewingId, setReviewingId]   = useState<string | null>(null)
  const [reviewNote, setReviewNote]     = useState('')
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved')

  // Expanded item-request detail
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('approval_requests')
      .select(`
        *,
        requester:profiles!approval_requests_requester_id_fkey(username, avatar_emoji),
        reviewer:profiles!approval_requests_reviewer_id_fkey(username),
        target:profiles!approval_requests_target_id_fkey(username)
      `)
      .order('created_at', { ascending: false })
    if (data) setRequests(data as ApprovalRequest[])

    // Load all profiles for target selector
    const { data: pdata } = await supabase
      .from('profiles')
      .select('id, username, avatar_emoji, role')
      .neq('id', user.id)
    if (pdata) setProfiles(pdata as Profile[])

    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadAll() }, [loadAll])

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('approvals-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, loadAll])

  // ── Actions ───────────────────────────────────────────────────────────────

  const openReview = (id: string, action: 'approved' | 'rejected') => {
    setReviewingId(id)
    setReviewAction(action)
    setReviewNote('')
  }

  const submitReview = async () => {
    if (!reviewingId || !user) return
    const req = requests.find(r => r.id === reviewingId)
    if (!req) return

    // If approving an item_price request, insert into item_prices
    if (reviewAction === 'approved' && req.request_type === 'item_price' && req.item_data) {
      await supabase.from('item_prices').insert({
        name: req.item_data.name,
        rarity: req.item_data.rarity,
        price_gp: req.item_data.price_gp,
        note: req.item_data.note,
        approved: true,
        created_by: req.requester_id,
      })
    }

    await supabase.from('approval_requests').update({
      status: reviewAction,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote.trim() || null,
    }).eq('id', reviewingId)

    setReviewingId(null)
    loadAll()
  }

  const submitNewRequest = async () => {
    if (!user || !formTitle.trim()) return
    await supabase.from('approval_requests').insert({
      requester_id: user.id,
      target_id: formTarget === 'gm' ? null : formTarget,
      request_type: 'general',
      title: formTitle.trim(),
      content: formContent.trim() || null,
    })
    setFormTitle('')
    setFormContent('')
    setFormTarget('gm')
    setShowForm(false)
    loadAll()
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Derived lists ─────────────────────────────────────────────────────────

  const pending  = requests.filter(r => r.status === 'pending')
  const history  = requests.filter(r => r.status !== 'pending')
  const myReqs   = requests.filter(r => r.requester_id === user?.id)
  const targeted = requests.filter(r => r.target_id === user?.id && r.status === 'pending')

  // ── Sub-components ────────────────────────────────────────────────────────

  const StatusBadge = ({ status }: { status: RequestStatus }) => {
    if (status === 'pending')  return <span className="flex items-center gap-1 text-amber-400 text-xs"><Clock className="w-3 h-3" />Ausstehend</span>
    if (status === 'approved') return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" />Genehmigt</span>
    return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" />Abgelehnt</span>
  }

  const TypeBadge = ({ type }: { type: RequestType }) => {
    if (type === 'item_price') return <span className="flex items-center gap-1 text-blue-400 text-xs bg-blue-900/30 border border-blue-700/40 px-1.5 py-0.5 rounded"><Package className="w-3 h-3" />Itempreis</span>
    return <span className="flex items-center gap-1 text-violet-400 text-xs bg-violet-900/30 border border-violet-700/40 px-1.5 py-0.5 rounded"><MessageSquare className="w-3 h-3" />Anfrage</span>
  }

  const RequestCard = ({ req, showActions }: { req: ApprovalRequest; showActions: boolean }) => {
    const isExp = expanded.has(req.id)
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Header row */}
        <div
          className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => toggleExpand(req.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <TypeBadge type={req.request_type} />
              <StatusBadge status={req.status} />
            </div>
            <p className="text-zinc-100 font-medium text-sm leading-snug">{req.title}</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              von{' '}
              <span className="text-zinc-400">
                {req.requester?.avatar_emoji ?? '🎲'} {req.requester?.username ?? '?'}
              </span>
              {req.target && (
                <> → <span className="text-zinc-400">{req.target.username}</span></>
              )}
              {!req.target_id && req.request_type === 'general' && (
                <> → <span className="text-zinc-400">GM</span></>
              )}
              <span className="ml-2 text-zinc-600">{fmtDate(req.created_at)}</span>
            </p>
          </div>
          {isExp ? <ChevronUp className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />}
        </div>

        {/* Expanded detail */}
        {isExp && (
          <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
            {req.content && (
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{req.content}</p>
            )}
            {req.request_type === 'item_price' && req.item_data && (
              <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-100 font-semibold">{req.item_data.name}</span>
                  <span className={`text-xs font-medium ${RARITY_COLORS[req.item_data.rarity] ?? 'text-zinc-400'}`}>
                    {RARITY_LABELS[req.item_data.rarity] ?? req.item_data.rarity}
                  </span>
                </div>
                <p className="text-amber-400 font-bold tabular-nums">{fmtGp(req.item_data.price_gp)}</p>
                {req.item_data.note && <p className="text-zinc-500 text-xs">{req.item_data.note}</p>}
              </div>
            )}
            {req.review_note && (
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-3 py-2">
                <p className="text-xs text-zinc-500 mb-0.5">Notiz von {req.reviewer?.username ?? 'GM'}:</p>
                <p className="text-zinc-300 text-sm">{req.review_note}</p>
              </div>
            )}
            {req.reviewed_at && (
              <p className="text-zinc-600 text-xs">Bearbeitet am {fmtDate(req.reviewed_at)}</p>
            )}

            {/* Action buttons */}
            {showActions && req.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openReview(req.id, 'approved')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 text-sm font-medium transition-colors"
                >
                  <Check className="w-4 h-4" /> Genehmigen
                </button>
                <button
                  onClick={() => openReview(req.id, 'rejected')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-900/60 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" /> Ablehnen
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-zinc-100">Genehmigungen</h1>
            {pending.length > 0 && (
              <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                {pending.length}
              </span>
            )}
          </div>
          {!isGM && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Neue Anfrage
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        {isGM ? (
          <>
            <button
              onClick={() => setGmTab('pending')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${gmTab === 'pending' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              <Clock className="w-4 h-4" />
              Ausstehend
              {pending.length > 0 && (
                <span className="text-xs bg-amber-600/80 text-white px-1.5 py-0.5 rounded-full leading-none">{pending.length}</span>
              )}
            </button>
            <button
              onClick={() => setGmTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${gmTab === 'history' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              <CheckCircle className="w-4 h-4" />
              Verlauf
              <span className="text-xs text-zinc-600">({history.length})</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setPlayerTab('mine')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${playerTab === 'mine' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              <Clock className="w-4 h-4" />
              Meine Anfragen
              {myReqs.filter(r => r.status === 'pending').length > 0 && (
                <span className="text-xs bg-amber-600/80 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {myReqs.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            {targeted.length > 0 && (
              <button
                onClick={() => setPlayerTab('mine')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${playerTab === 'mine' ? 'border-amber-500 text-amber-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
              >
                <Bell className="w-4 h-4" />
                An mich
                <span className="text-xs bg-amber-600/80 text-white px-1.5 py-0.5 rounded-full leading-none">{targeted.length}</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Player: new request form */}
      {!isGM && showForm && (
        <div className="flex-shrink-0 px-4 py-3 bg-zinc-900 border-b border-zinc-800 space-y-2">
          <p className="text-sm font-semibold text-zinc-200">Neue Anfrage</p>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            placeholder="Titel der Anfrage"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
          />
          <textarea
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
            placeholder="Beschreibung (optional)"
            value={formContent}
            onChange={e => setFormContent(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 whitespace-nowrap">An:</label>
            <select
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              value={formTarget}
              onChange={e => setFormTarget(e.target.value)}
            >
              <option value="gm">🎯 Game Master</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.avatar_emoji ?? '🎲'} {p.username}
                </option>
              ))}
            </select>
            <button
              onClick={submitNewRequest}
              disabled={!formTitle.trim()}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm font-bold text-white transition-colors"
            >
              Senden
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Lade…</div>
        ) : isGM ? (
          <>
            {gmTab === 'pending' && (
              pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-600">
                  <CheckCircle className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Keine offenen Genehmigungen</p>
                </div>
              ) : (
                pending.map(r => <RequestCard key={r.id} req={r} showActions={true} />)
              )
            )}
            {gmTab === 'history' && (
              history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-600">
                  <Clock className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Noch keine bearbeiteten Anfragen</p>
                </div>
              ) : (
                history.map(r => <RequestCard key={r.id} req={r} showActions={false} />)
              )
            )}
          </>
        ) : (
          <>
            {/* targeted requests first */}
            {targeted.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">An dich gerichtet</p>
                {targeted.map(r => <RequestCard key={r.id} req={r} showActions={true} />)}
              </div>
            )}
            {/* own requests */}
            {myReqs.length === 0 && targeted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-600">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">Noch keine Anfragen</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-xs text-amber-500 hover:text-amber-400 underline"
                >
                  Erste Anfrage senden
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {myReqs.length > 0 && <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Meine Anfragen</p>}
                {myReqs.map(r => <RequestCard key={r.id} req={r} showActions={false} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Review modal */}
      {reviewingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              {reviewAction === 'approved'
                ? <CheckCircle className="w-5 h-5 text-green-400" />
                : <XCircle className="w-5 h-5 text-red-400" />
              }
              <h2 className="text-lg font-bold text-zinc-100">
                {reviewAction === 'approved' ? 'Genehmigen' : 'Ablehnen'}
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <textarea
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Optionale Notiz / Begründung…"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setReviewingId(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={submitReview}
                  className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors ${
                    reviewAction === 'approved'
                      ? 'bg-green-700 hover:bg-green-600'
                      : 'bg-red-700 hover:bg-red-600'
                  }`}
                >
                  {reviewAction === 'approved' ? 'Genehmigen' : 'Ablehnen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
