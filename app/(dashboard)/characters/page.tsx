'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CharacterLinkCard } from '@/components/characters/CharacterLink'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink, User, CharacterFullData } from '@/types'
import { Heart, Shield, Eye, Zap, ExternalLink, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

function hpColor(cur: number, max: number) {
  const pct = max > 0 ? cur / max : 0
  if (pct > 0.6) return 'bg-emerald-500'
  if (pct > 0.3) return 'bg-yellow-500'
  return 'bg-red-500'
}

function modSign(n: number) { return n >= 0 ? `+${n}` : `${n}` }

function GMCharacterCard({ c, onRefresh }: {
  c: CharacterLink & { user: User }
  onRefresh: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const d: CharacterFullData | null = (c.full_data as CharacterFullData | undefined) ?? null

  const hp = d?.max_hp ?? 0
  const hpPct = hp > 0 ? Math.min(100, (hp / hp) * 100) : 0

  const passivePerception = d ? 10 + (d.skills.find(s => s.key === 'perception')?.bonus ?? 0) : null
  const passiveInsight    = d ? 10 + (d.skills.find(s => s.key === 'insight')?.bonus ?? 0) : null
  const passiveInvestigation = d ? 10 + (d.skills.find(s => s.key === 'investigation')?.bonus ?? 0) : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-base font-bold text-zinc-200 flex-shrink-0">
          {(c.user as User & { avatar_emoji?: string })?.avatar_emoji ?? c.user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500">{c.user?.username}</p>
          <p className="text-base font-bold text-zinc-100 leading-tight truncate">{c.character_name}</p>
          <p className="text-xs text-zinc-400">{c.class_name} · Stufe {c.level}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRefresh(c.id)}
            className="p-1.5 text-zinc-500 hover:text-amber-400 transition-colors"
            title="Daten aktualisieren"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {c.dnd_beyond_url && (
            <a href={c.dnd_beyond_url} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="DnD Beyond">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 text-zinc-500 hover:text-zinc-300">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {d ? (
        <>
          {/* Combat stats summary */}
          <div className="px-4 py-3 space-y-2">
            {/* HP bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Heart className="w-3 h-3 text-red-400" /> HP
                </div>
                <span className="text-sm font-bold text-zinc-100">{d.max_hp} / {d.max_hp}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${hpColor(hp, hp)}`} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Shield className="w-3 h-3 text-zinc-400" />
                </div>
                <p className="text-lg font-black text-zinc-100">{d.armor_class}</p>
                <p className="text-[10px] text-zinc-500">RK</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-amber-400">{modSign(d.initiative)}</p>
                <p className="text-[10px] text-zinc-500">Init</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">{d.speed}</p>
                <p className="text-[10px] text-zinc-500">Tempo</p>
              </div>
              <div className="text-center bg-zinc-800/60 rounded-lg py-2">
                <p className="text-lg font-black text-zinc-100">{modSign(d.proficiency_bonus)}</p>
                <p className="text-[10px] text-zinc-500">Prof</p>
              </div>
            </div>

            {/* Passive values */}
            {(passivePerception !== null) && (
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs">
                  <Eye className="w-3 h-3 text-zinc-500" />
                  <span className="text-zinc-400">Wahrnehmung</span>
                  <span className="font-bold text-zinc-100">{passivePerception}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400">Einsicht</span>
                  <span className="font-bold text-zinc-100">{passiveInsight}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400">Nachforschung</span>
                  <span className="font-bold text-zinc-100">{passiveInvestigation}</span>
                </div>
              </div>
            )}
          </div>

          {/* Expanded: full stats */}
          {open && (
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
              {/* Ability scores */}
              <div>
                <p className="text-xs text-zinc-500 font-semibold mb-2">Attribute</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {['STR','DEX','CON','INT','WIS','CHA'].map(ab => (
                    <div key={ab} className="text-center bg-zinc-800/60 rounded-lg py-1.5">
                      <p className="text-[10px] text-zinc-500">{ab}</p>
                      <p className="text-xs font-bold text-zinc-100">{modSign(Math.floor(((d.stats[ab] ?? 10) - 10) / 2))}</p>
                      <p className="text-[10px] text-zinc-600">{d.stats[ab]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saves */}
              <div>
                <p className="text-xs text-zinc-500 font-semibold mb-2">Rettungswürfe</p>
                <div className="flex flex-wrap gap-1.5">
                  {(d.saves ?? []).map(s => (
                    <span key={s.ability} className={`text-xs px-2 py-0.5 rounded border ${
                      s.proficient ? 'bg-amber-900/30 border-amber-700/40 text-amber-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}>
                      {s.proficient && '● '}{s.ability} {modSign(s.bonus)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Weapons */}
              {(d.weapons ?? []).filter(w => w.equipped).length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-semibold mb-2">Ausgerüstete Waffen</p>
                  <div className="space-y-1">
                    {d.weapons.filter(w => w.equipped).map((w, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400">⚔</span>
                        <span className="text-zinc-200 flex-1">{w.name}</span>
                        <span className="text-zinc-400">Atk {modSign(w.attackBonus)}</span>
                        <span className="text-zinc-400">{w.damage}{w.damageBonus !== 0 ? modSign(w.damageBonus) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-500">Keine Charakterdaten geladen. Spieler muss den Charakter verlinken und Daten synchronisieren.</p>
        </div>
      )}
    </div>
  )
}

export default function CharactersPage() {
  const { user, isGM } = useAuth()
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [allCharacters, setAllCharacters] = useState<(CharacterLink & { user: User })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = async () => {
    if (!user) return
    if (isGM) {
      const { data } = await supabase
        .from('character_links')
        .select('*, user:profiles(id, username, role, avatar_url, avatar_emoji, display_name)')
        .order('created_at')
      setAllCharacters(data ?? [])
    } else {
      const { data } = await supabase
        .from('character_links')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setCharacter(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleRefresh = async (linkId: string) => {
    const link = allCharacters.find(c => c.id === linkId)
    if (!link) return
    try {
      const res = await fetch(`/api/dnd-character?url=${encodeURIComponent(link.dnd_beyond_url)}`)
      if (!res.ok) return
      const data = await res.json()
      await supabase.from('character_links').update({
        full_data: data,
        character_name: data.character_name,
        class_name: data.class_name,
        level: data.level,
        updated_at: new Date().toISOString(),
      }).eq('id', linkId)
      fetchAll()
    } catch {}
  }

  if (!user || loading) return null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Charaktere</h1>
        <p className="text-sm text-zinc-400">
          {isGM ? 'Gruppenübersicht aller Charaktere' : 'Dein DnD Beyond Charakter'}
        </p>
      </div>

      {isGM ? (
        <div className="space-y-4">
          {allCharacters.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>Noch keine Charaktere verlinkt.</p>
              <p className="text-sm mt-1">Spieler können ihre Charaktere unter „Charaktere" verlinken.</p>
            </div>
          )}
          {allCharacters.map((c) => (
            <GMCharacterCard key={c.id} c={c} onRefresh={handleRefresh} />
          ))}
        </div>
      ) : (
        <CharacterLinkCard
          character={character}
          currentUser={user}
          onSaved={setCharacter}
        />
      )}
    </div>
  )
}
