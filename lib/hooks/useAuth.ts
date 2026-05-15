'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser(profile)
      } else {
        // Profile not created by trigger yet — build from auth metadata
        const meta = authUser.user_metadata ?? {}
        const fallback: User = {
          id: authUser.id,
          username: meta.username ?? authUser.email?.split('@')[0] ?? 'Spieler',
          email: authUser.email ?? '',
          role: meta.role ?? 'player',
          created_at: authUser.created_at,
        }
        // Try to insert the profile manually (trigger might have failed)
        await supabase.from('profiles').upsert({
          id: authUser.id,
          username: fallback.username,
          role: fallback.role,
        }, { onConflict: 'id' })
        setUser(fallback)
      }

      setLoading(false)
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, loading, signOut, isGM: user?.role === 'gm' }
}
