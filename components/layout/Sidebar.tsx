'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays, BookOpen, ScrollText, LogOut, Shield, Sword, Dices,
  Backpack, Map, MapPin, Settings, Image as ImageIcon, BookText,
  MessageSquare, Tag, Swords, Bell, GripVertical, Lock, Unlock,
  Users, GitBranch, ClipboardList, PawPrint, Eye, EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_NAV: { href: string; label: string; icon: React.ElementType }[] = [
  { href: '/dashboard',  label: 'Übersicht',         icon: Shield        },
  { href: '/sessions',   label: 'Sessions',           icon: CalendarDays  },
  { href: '/summaries',  label: 'Zusammenfassungen',  icon: BookText      },
  { href: '/quests',     label: 'Quests',             icon: Map           },
  { href: '/npcs',       label: 'NPCs',               icon: Users         },
  { href: '/plot',       label: 'Offene Fäden',       icon: GitBranch     },
  { href: '/extras',     label: 'Extras / NPC',       icon: PawPrint      },
  { href: '/maps',       label: 'Karte',              icon: MapPin        },
  { href: '/dice',       label: 'Würfelwürfe',        icon: Dices         },
  { href: '/log',        label: 'Log',                icon: ClipboardList },
  { href: '/loot',       label: 'Loot',               icon: Backpack      },
  { href: '/gallery',    label: 'Bilder',             icon: ImageIcon     },
  { href: '/notes',      label: 'Notizen',            icon: ScrollText    },
  { href: '/characters', label: 'Charaktere',         icon: Sword         },
  { href: '/rules',      label: 'Grundregeln',        icon: BookOpen      },
  { href: '/chat',       label: 'Chat',               icon: MessageSquare },
  { href: '/prices',     label: 'Item Preise',        icon: Tag           },
  { href: '/battlemap',  label: 'Spielfeld',          icon: Swords        },
  { href: '/approvals',  label: 'Genehmigungen',      icon: Bell          },
]

export function Sidebar() {
  const pathname   = usePathname()
  const { user, signOut, isGM } = useAuth()
  const supabase   = createClient()

  const [navItems, setNavItems]   = useState(DEFAULT_NAV)
  const [isLocked, setIsLocked]   = useState(true)
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set())
  const [pendingCount, setPendingCount] = useState(0)

  const dragIdx     = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)

  // ── Load saved order + hidden tabs + pending-approval count ──────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tab_order, hidden_tabs')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.tab_order) {
        const order: string[] = data.tab_order
        const sorted = [
          ...order
            .map(href => DEFAULT_NAV.find(n => n.href === href))
            .filter(Boolean) as typeof DEFAULT_NAV,
          ...DEFAULT_NAV.filter(n => !order.includes(n.href)),
        ]
        setNavItems(sorted)
      }
      if (data?.hidden_tabs) {
        setHiddenTabs(new Set(data.hidden_tabs as string[]))
      }
    }
    load()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pending approvals badge
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { count } = await supabase
        .from('approval_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    load()
    const ch = supabase
      .channel('sidebar-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveOrder = useCallback(async (items: typeof DEFAULT_NAV) => {
    if (!user) return
    await supabase
      .from('profiles')
      .update({ tab_order: items.map(n => n.href) })
      .eq('id', user.id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveHidden = useCallback(async (hidden: Set<string>) => {
    if (!user) return
    await supabase
      .from('profiles')
      .update({ hidden_tabs: Array.from(hidden) })
      .eq('id', user.id)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHidden = (href: string) => {
    setHiddenTabs(prev => {
      const next = new Set(prev)
      if (next.has(href)) next.delete(href)
      else next.add(href)
      saveHidden(next)
      return next
    })
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragStart = (idx: number) => { dragIdx.current = idx }
  const onDragEnter = (idx: number) => { dragOverIdx.current = idx }
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault() }
  const onDragEnd   = () => {
    if (dragIdx.current === null || dragOverIdx.current === null) return
    const next = [...navItems]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(dragOverIdx.current, 0, moved)
    dragIdx.current = null
    dragOverIdx.current = null
    setNavItems(next)
    saveOrder(next)
  }

  // Visible items in lock mode = not hidden
  const visibleItems = isLocked ? navItems.filter(n => !hiddenTabs.has(n.href)) : navItems

  return (
    <aside className="hidden md:flex flex-col w-60 bg-zinc-900 border-r border-zinc-800 min-h-screen">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon }, index) => {
          const active   = pathname === href || pathname.startsWith(href + '/')
          const isHidden = hiddenTabs.has(href)
          const isApprovals = href === '/approvals'

          if (!isLocked) {
            // Drag + visibility mode
            return (
              <div
                key={href}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragEnter={() => onDragEnter(index)}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-colors',
                  isHidden
                    ? 'opacity-40 text-zinc-600 hover:bg-zinc-800/50'
                    : active
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                )}
              >
                <GripVertical className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className={cn('flex-1 truncate text-xs', isHidden && 'line-through')}>{label}</span>
                {/* Eye toggle */}
                <button
                  onClick={e => { e.stopPropagation(); toggleHidden(href) }}
                  className="p-0.5 rounded hover:bg-zinc-700 transition-colors flex-shrink-0"
                  title={isHidden ? 'Einblenden' : 'Ausblenden'}
                >
                  {isHidden
                    ? <EyeOff className="w-3.5 h-3.5 text-zinc-600" />
                    : <Eye className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                  }
                </button>
              </div>
            )
          }

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
              <span className="flex-1 truncate">{label}</span>
              {isApprovals && pendingCount > 0 && (
                <span className="text-[10px] leading-none font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin (fixed) */}
        {isGM && isLocked && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-1',
              pathname === '/admin'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Admin
          </Link>
        )}

        {/* Lock / unlock */}
        <button
          onClick={() => setIsLocked(l => !l)}
          className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors"
        >
          {isLocked
            ? <><Unlock className="w-3.5 h-3.5" /> Reihenfolge &amp; Sichtbarkeit</>
            : <><Lock className="w-3.5 h-3.5" /> Fertig</>
          }
        </button>
      </nav>

      {/* User / logout */}
      {user && (
        <div className="p-3 border-t border-zinc-800">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1',
              pathname === '/settings'
                ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            )}
          >
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-base flex-shrink-0">
              {user.avatar_emoji ?? user.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {user.display_name ?? user.username}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user.role === 'gm' ? '⚔️ GM' : '🎲 Spieler'}</p>
            </div>
            <Settings className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
          </Link>
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
