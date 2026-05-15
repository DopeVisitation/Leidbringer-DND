'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CharacterLinkCard } from '@/components/characters/CharacterLink'
import { createClient } from '@/lib/supabase/client'
import type { CharacterLink, User } from '@/types'

export default function CharactersPage() {
  const { user, isGM } = useAuth()
  const [character, setCharacter] = useState<CharacterLink | null>(null)
  const [allCharacters, setAllCharacters] = useState<(CharacterLink & { user: User })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      if (isGM) {
        const { data } = await supabase
          .from('character_links')
          .select('*, user:profiles(id, username, role, avatar_url)')
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
    fetch()
  }, [user])

  if (!user || loading) return null

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Charaktere</h1>
        <p className="text-sm text-zinc-400">
          {isGM ? 'Alle verlinkten Charaktere deiner Gruppe' : 'Dein DnD Beyond Charakter'}
        </p>
      </div>

      {isGM ? (
        <div className="space-y-3">
          {allCharacters.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>Noch keine Charaktere verlinkt.</p>
              <p className="text-sm mt-1">Spieler können ihre Charaktere unter „Charaktere" verlinken.</p>
            </div>
          )}
          {allCharacters.map((c) => (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                  {c.user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <p className="text-sm font-medium text-zinc-300">{c.user?.username}</p>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <div>
                  <p className="text-base font-bold text-zinc-100">{c.character_name}</p>
                  <p className="text-sm text-zinc-400">{c.class_name} · Level {c.level}</p>
                </div>
                {c.dnd_beyond_url && (
                  <a
                    href={c.dnd_beyond_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >
                    DnD Beyond ↗
                  </a>
                )}
              </div>
            </div>
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
