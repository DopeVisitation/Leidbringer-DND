'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@/types'

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        responses:session_responses(
          *,
          user:profiles(id, username, avatar_url)
        )
      `)
      .order('start_date', { ascending: true })

    setSessions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSessions()

    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_responses' }, fetchSessions)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSessions])

  return { sessions, loading, refetch: fetchSessions }
}

export function useSession(id: string) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('sessions')
        .select(`
          *,
          responses:session_responses(
            *,
            user:profiles(id, username, avatar_url)
          )
        `)
        .eq('id', id)
        .single()

      setSession(data)
      setLoading(false)
    }

    fetch()
  }, [id])

  return { session, loading }
}
