'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  BookOpen,
  ScrollText,
  LogOut,
  Shield,
  Sword,
  Dices,
  Backpack,
  Map,
  MapPin,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'

const navItems = [
  { href: '/dashboard', label: 'Übersicht', icon: Shield },
  { href: '/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/quests', label: 'Quests', icon: Map },
  { href: '/maps', label: 'Karte', icon: MapPin },
  { href: '/dice', label: 'Würfelwürfe', icon: Dices },
  { href: '/loot', label: 'Loot', icon: Backpack },
  { href: '/notes', label: 'Notizen', icon: ScrollText },
  { href: '/characters', label: 'Charaktere', icon: Sword },
  { href: '/rules', label: 'Grundregeln', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, isGM } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-zinc-900 border-r border-zinc-800 min-h-screen">
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-100" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">DnD Companion</p>
            <p className="text-xs text-zinc-500">
              {isGM ? '⚔️ Game Master' : '🎲 Spieler'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}

        {isGM && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2',
              pathname === '/admin'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Admin
          </Link>
        )}
      </nav>

      {user && (
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              {user.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{user.username}</p>
              <p className="text-xs text-zinc-500 truncate">{user.role === 'gm' ? 'Game Master' : 'Spieler'}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      )}
    </aside>
  )
}
