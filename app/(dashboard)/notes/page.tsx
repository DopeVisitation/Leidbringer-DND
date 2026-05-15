'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotes, usePrivateMessages } from '@/lib/hooks/useNotes'
import { NoteEditor } from '@/components/notes/NoteEditor'
import { GMPrivateChat } from '@/components/notes/GMPrivateChat'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export default function NotesPage() {
  const { user, isGM } = useAuth()
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes')

  // GM state: list of players to chat with
  const [players, setPlayers] = useState<User[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Player state: the GM's profile
  const [gmProfile, setGmProfile] = useState<User | null>(null)

  const supabase = createClient()
  const { notes, saveNote, deleteNote } = useNotes(user?.id ?? '')

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      if (isGM) {
        // GM sees all players
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'player')
        setPlayers(data ?? [])
        if (data?.[0]) setSelectedPlayerId(data[0].id)
      } else {
        // Player fetches the GM
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'gm')
          .limit(1)
          .single()
        setGmProfile(data)
      }
    }
    fetch()
  }, [user, isGM])

  // Determine playerId and gmId for the chat hook
  const chatPlayerId = isGM ? (selectedPlayerId ?? '') : (user?.id ?? '')
  const chatGmId = isGM ? (user?.id ?? '') : (gmProfile?.id ?? '')

  const { messages, sendMessage } = usePrivateMessages(chatPlayerId, chatGmId)

  if (!user) return null

  const noGM = !isGM && !gmProfile

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-[calc(100vh-120px)] md:h-[calc(100vh-32px)] flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Notizen</h1>
        <p className="text-sm text-zinc-400">Deine persönlichen Aufzeichnungen</p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'notes'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          📝 Meine Notizen
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          🔒 {isGM ? 'Spieler-Nachrichten' : 'Privat an GM'}
        </button>
      </div>

      {/* GM: player selector */}
      {isGM && activeTab === 'chat' && (
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {players.length === 0 && (
            <p className="text-sm text-zinc-500">Noch keine Spieler registriert.</p>
          )}
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                selectedPlayerId === p.id
                  ? 'bg-amber-600/20 border-amber-600/40 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.username}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeTab === 'notes' ? (
          <NoteEditor notes={notes} onSave={saveNote} onDelete={deleteNote} />
        ) : noGM ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            Kein Game Master gefunden. Bitte den GM, sich zuerst zu registrieren.
          </div>
        ) : (
          <GMPrivateChat
            messages={messages}
            currentUser={user}
            onSend={(msg) => sendMessage(msg, user.role)}
            playerName={
              isGM
                ? players.find((p) => p.id === selectedPlayerId)?.username
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}
