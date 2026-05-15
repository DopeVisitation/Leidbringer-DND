'use client'

import { LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

export function MobileHeader() {
  const { user, signOut, isGM } = useAuth()

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-amber-100" />
        </div>
        <span className="text-sm font-semibold text-zinc-100">DnD Companion</span>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                {user.username?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs text-zinc-400">
                {isGM ? '⚔️ GM' : '🎲 ' + user.username}
              </span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-red-400 hover:border-red-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Abmelden
            </button>
          </>
        )}
      </div>
    </header>
  )
}
