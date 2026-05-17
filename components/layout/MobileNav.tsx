'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Shield, Dices, MessageSquare, Swords, Bell, Users, GitBranch, ClipboardList, PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

const navItems = [
  { href: '/dashboard',  label: 'Home',     icon: Shield        },
  { href: '/sessions',   label: 'Sessions', icon: CalendarDays  },
  { href: '/npcs',       label: 'NPCs',     icon: Users         },
  { href: '/plot',       label: 'Fäden',    icon: GitBranch     },
  { href: '/dice',       label: 'Würfel',   icon: Dices         },
  { href: '/chat',       label: 'Chat',     icon: MessageSquare },
  { href: '/battlemap',  label: 'Kampf',    icon: Swords        },
  { href: '/approvals',  label: 'Anträge',  icon: Bell          },
  { href: '/log',        label: 'Log',      icon: ClipboardList },
  { href: '/extras',     label: 'Extras',   icon: PawPrint      },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState(0)

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
      .channel('mobilenav-approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          const isApprovals = href === '/approvals'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors relative',
                active ? 'text-amber-400' : 'text-zinc-500'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isApprovals && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 text-[9px] leading-none font-bold bg-amber-600 text-white px-1 py-0.5 rounded-full min-w-[14px] text-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
