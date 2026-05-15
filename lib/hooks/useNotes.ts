'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Note, GMPrivateMessage } from '@/types'

export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })

    setNotes(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    fetchNotes()
  }, [fetchNotes])

  const saveNote = async (note: Partial<Note>) => {
    if (note.id) {
      const { data } = await supabase
        .from('notes')
        .update({ ...note, updated_at: new Date().toISOString() })
        .eq('id', note.id)
        .select()
        .single()
      setNotes((prev) => prev.map((n) => (n.id === note.id ? data : n)))
    } else {
      const { data } = await supabase
        .from('notes')
        .insert({ ...note, owner_id: userId })
        .select()
        .single()
      setNotes((prev) => [data, ...prev])
    }
  }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return { notes, loading, saveNote, deleteNote, refetch: fetchNotes }
}

export function usePrivateMessages(playerId: string, gmId: string) {
  const [messages, setMessages] = useState<GMPrivateMessage[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!playerId || !gmId) return

    const fetch = async () => {
      const { data } = await supabase
        .from('gm_private_messages')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: true })

      setMessages(data ?? [])
    }

    fetch()

    const channel = supabase
      .channel(`private-${playerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'gm_private_messages',
        filter: `player_id=eq.${playerId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as GMPrivateMessage])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playerId, gmId])

  const sendMessage = async (message: string, senderRole: 'gm' | 'player') => {
    await supabase.from('gm_private_messages').insert({
      player_id: playerId,
      gm_id: gmId,
      sender_role: senderRole,
      message,
    })
  }

  return { messages, sendMessage }
}
