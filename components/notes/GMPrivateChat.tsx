'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import type { GMPrivateMessage, User } from '@/types'

interface GMPrivateChatProps {
  messages: GMPrivateMessage[]
  currentUser: User
  onSend: (message: string) => Promise<void>
  playerName?: string
}

export function GMPrivateChat({ messages, currentUser, onSend, playerName }: GMPrivateChatProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    setText('')
    await onSend(trimmed)
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isGM = currentUser.role === 'gm'
  const title = isGM
    ? `Privat: ${playerName ?? 'Spieler'}`
    : 'Privat an GM'

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-sm font-semibold text-zinc-200">🔒 {title}</p>
        <p className="text-xs text-zinc-500">Nur du und der GM können diese Nachrichten sehen</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-8">Noch keine Nachrichten</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_role === currentUser.role
          return (
            <div
              key={msg.id}
              className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  isOwn
                    ? 'bg-amber-600 text-white rounded-br-sm'
                    : msg.sender_role === 'gm'
                    ? 'bg-purple-900/60 border border-purple-700/50 text-purple-100 rounded-bl-sm'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                )}
              >
                {msg.message}
              </div>
              <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
