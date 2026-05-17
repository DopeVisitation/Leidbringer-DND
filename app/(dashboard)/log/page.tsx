'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Search, Download, RefreshCw, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

type ActionType = 'move' | 'hp' | 'action' | 'gm' | 'roll' | 'note'

interface CombatLogEntry {
  id: string
  actor_name: string | null
  action_type: ActionType
  description: string | null
  is_gm_action: boolean
  created_at: string
  map_id: string | null
}

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; color: string; bg: string }> = {
  move:   { label: 'Bewegung',  color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-800/50'   },
  hp:     { label: 'HP',        color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800/50'     },
  action: { label: 'Aktion',    color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-800/50' },
  gm:     { label: 'GM',        color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/50'},
  roll:   { label: 'Wurf',      color: 'text-emerald-400',bg: 'bg-emerald-900/20 border-emerald-800/50'},
  note:   { label: 'Notiz',     color: 'text-zinc-400',   bg: 'bg-zinc-800/50 border-zinc-700'      },
}

const PAGE_SIZE = 100

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function exportCSV(entries: CombatLogEntry[]) {
  const header = 'Zeitpunkt,Akteur,Typ,Beschreibung,GM-Aktion,Karte'
  const rows = entries.map(e => [
    `"${formatTime(e.created_at)}"`,
    `"${e.actor_name ?? ''}"`,
    `"${ACTION_TYPE_CONFIG[e.action_type]?.label ?? e.action_type}"`,
    `"${(e.description ?? '').replace(/"/g, '""')}"`,
    e.is_gm_action ? 'Ja' : 'Nein',
    `"${e.map_id ?? ''}"`,
  ].join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `kampf-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function LogPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()

  const [entries, setEntries]           = useState<CombatLogEntry[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [typeFilter, setTypeFilter]     = useState<ActionType | 'all'>('all')
  const [offset, setOffset]             = useState(0)
  const [hasMore, setHasMore]           = useState(false)
  const [loadingMore, setLoadingMore]   = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const buildQuery = useCallback((from: number) => {
    let q = supabase
      .from('combat_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE)

    if (!isGM) {
      q = q.eq('is_gm_action', false)
    }
    return q
  }, [isGM]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitial = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await buildQuery(0)
    const list = (data ?? []) as CombatLogEntry[]
    setEntries(list)
    setOffset(PAGE_SIZE + 1)
    setHasMore(list.length === PAGE_SIZE + 1)
    setLoading(false)
  }, [user, buildQuery])

  const loadMore = async () => {
    setLoadingMore(true)
    const { data } = await buildQuery(offset)
    const list = (data ?? []) as CombatLogEntry[]
    setEntries(prev => [...prev, ...list])
    setOffset(prev => prev + PAGE_SIZE + 1)
    setHasMore(list.length === PAGE_SIZE + 1)
    setLoadingMore(false)
  }

  useEffect(() => {
    if (!user) return
    loadInitial()

    // Realtime subscription
    const ch = supabase
      .channel('combat_log_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'combat_log' },
        (payload) => {
          const newEntry = payload.new as CombatLogEntry
          if (!isGM && newEntry.is_gm_action) return
          setEntries(prev => [newEntry, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'combat_log' },
        (payload) => {
          setEntries(prev => prev.filter(e => e.id !== (payload.old as { id: string }).id))
        }
      )
      .subscribe()

    channelRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [user, isGM, loadInitial]) // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side search + filter
  const filtered = entries.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (e.actor_name ?? '').toLowerCase().includes(q)
      || (e.description ?? '').toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || e.action_type === typeFilter
    return matchSearch && matchType
  })

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Kampf-Log</h1>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadInitial}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isGM && (
            <button
              onClick={() => exportCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              CSV Export
            </button>
          )}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Akteur oder Beschreibung suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ActionType | 'all')}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          <option value="all">Alle Typen</option>
          {(Object.keys(ACTION_TYPE_CONFIG) as ActionType[]).map(t => (
            <option key={t} value={t}>{ACTION_TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {/* Log Entries */}
      {loading ? (
        <div className="text-center text-zinc-600 py-16">
          <p className="text-sm">Wird geladen…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-zinc-600 py-16">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {search || typeFilter !== 'all' ? 'Keine Einträge gefunden.' : 'Noch keine Log-Einträge vorhanden.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((entry) => {
            const cfg = ACTION_TYPE_CONFIG[entry.action_type] ?? ACTION_TYPE_CONFIG.note
            return (
              <div
                key={entry.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-3 hover:border-zinc-700 transition-colors"
              >
                {/* Type badge */}
                <span className={`flex-shrink-0 mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.actor_name && (
                      <span className="text-sm font-semibold text-zinc-100">{entry.actor_name}</span>
                    )}
                    {isGM && entry.is_gm_action && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-800/50 bg-purple-900/20 text-purple-400">
                        GM
                      </span>
                    )}
                  </div>
                  {entry.description && (
                    <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words">{entry.description}</p>
                  )}
                </div>

                {/* Timestamp */}
                <span className="flex-shrink-0 text-[11px] text-zinc-600 mt-0.5 tabular-nums">
                  {formatTime(entry.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
            {loadingMore ? 'Wird geladen…' : 'Mehr laden'}
          </button>
        </div>
      )}
    </div>
  )
}
