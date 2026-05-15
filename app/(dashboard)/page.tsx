'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, ScrollText, Sword, BookOpen, Users } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSessions } from '@/lib/hooks/useSessions'
import { countAccepted, formatDate, formatTime, getSessionBadgeColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink } from '@/types'

export default function DashboardPage() {
  const { user, isGM } = useAuth()
  const { sessions, loading } = useSessions()
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      if (!isGM) {
        const { data } = await supabase
          .from('character_links')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setCharacter(data)
      }
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'player')
      setPlayerCount(count ?? 0)
    }
    fetch()
  }, [user])

  const upcoming = sessions.filter(
    (s) => new Date(s.start_date) >= new Date()
  ).slice(0, 3)

  const requiredPlayers = playerCount || 4

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Willkommen, {user.username}! {isGM ? '⚔️' : '🎲'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {isGM ? 'Game Master Dashboard' : 'Spieler Dashboard'}
        </p>
      </div>

      {/* Character banner (players only) */}
      {!isGM && character && (
        <Link href="/characters" className="block">
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-center gap-4 hover:bg-amber-900/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-amber-800/50 flex items-center justify-center text-2xl">
              ⚔️
            </div>
            <div>
              <p className="text-xs text-amber-500 font-medium uppercase tracking-wider">Dein Charakter</p>
              <p className="text-base font-bold text-zinc-100">{character.character_name}</p>
              <p className="text-sm text-zinc-400">{character.class_name} · Level {character.level}</p>
            </div>
          </div>
        </Link>
      )}

      {!isGM && !character && (
        <Link href="/characters">
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-4 flex items-center gap-3 hover:border-amber-600 transition-colors cursor-pointer">
            <Sword className="w-5 h-5 text-zinc-500" />
            <div>
              <p className="text-sm font-medium text-zinc-300">Charakter verlinken</p>
              <p className="text-xs text-zinc-500">Verbinde deinen DnD Beyond Charakter</p>
            </div>
          </div>
        </Link>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <CalendarDays className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-zinc-100">{upcoming.length}</p>
          <p className="text-xs text-zinc-400">Kommende Sessions</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <Users className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-zinc-100">{playerCount}</p>
          <p className="text-xs text-zinc-400">Aktive Spieler</p>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-200">Nächste Sessions</h2>
          <Link href="/sessions" className="text-xs text-amber-500 hover:text-amber-400">
            Alle anzeigen →
          </Link>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && upcoming.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-sm">
            {isGM
              ? 'Noch keine Sessions geplant. Erstelle eine neue Session!'
              : 'Noch keine Sessions geplant.'}
          </div>
        )}

        <div className="space-y-2">
          {upcoming.map((session) => {
            const accepted = countAccepted(session.responses ?? [])
            const myResp = session.responses?.find((r) => r.user_id === user.id)
            return (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{session.title}</p>
                      <p className="text-xs text-zinc-400">
                        {formatDate(session.start_date)} · {formatTime(session.start_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {myResp && (
                        <span className={`text-xs font-medium ${
                          myResp.status === 'accepted' ? 'text-emerald-400' :
                          myResp.status === 'maybe' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {myResp.status === 'accepted' ? '✅' : myResp.status === 'maybe' ? '🤔' : '❌'}
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSessionBadgeColor(accepted, requiredPlayers)}`}>
                        {accepted}/{requiredPlayers}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/notes', icon: ScrollText, label: 'Meine Notizen', color: 'text-blue-400' },
          { href: '/rules', icon: BookOpen, label: 'DnD 5e Regeln', color: 'text-purple-400' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 hover:border-zinc-700 transition-colors">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-sm font-medium text-zinc-200">{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
