'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Shield, Dices, MapPin, MessageSquare, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',  label: 'Home',     icon: Shield        },
  { href: '/sessions',   label: 'Sessions', icon: CalendarDays  },
  { href: '/maps',       label: 'Karte',    icon: MapPin        },
  { href: '/dice',       label: 'Würfel',   icon: Dices         },
  { href: '/chat',       label: 'Chat',     icon: MessageSquare },
  { href: '/battlemap',  label: 'Kampf',    icon: Swords        },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-amber-400' : 'text-zinc-500'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
