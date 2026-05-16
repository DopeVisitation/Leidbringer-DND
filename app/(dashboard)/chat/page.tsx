'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, Search, Hash, AtSign, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface ChatMessage {
  id: string
  content: string
  tags: string[]
  pinged_usernames: string[]
  created_by: string
  created_at: string
  user: { id: string; username: string; role: string } | null
}

function parseContent(text: string): { tags: string[]; pings: string[] } {
  const tags = (text.match(/#(\w+)/g) ?? []).map((t) => t.slice(1))
  const pings = (text.match(/@(\w+)/g) ?? []).map((p) => p.slice(1))
  return { tags, pings }
}

function renderMessage(content: string) {
  // Highlight #tags and @pings in message text
  const parts = content.split(/(#\w+|@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <span key={i} className="text-amber-400 font-semibold">{part}</span>
    }
    if (part.startsWith('@')) {
      return <span key={i} className="text-blue-400 font-semibold bg-blue-400/10 px-0.5 rounded">{part}</span>
    }
    return <span key={i}>{part}</span>
  })
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`
  return new Date(dateStr).toLocaleDateString('de', { day: '2-digit', month: '2-digit' })
}

export default function ChatPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, user:profiles(id,username,role)')
      .order('created_at', { ascending: true })
      .limit(200)
    if (data) setMessages(data as ChatMessage[])
  }, [supabase])

  useEffect(() => {
    loadMessages()
    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadMessages, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!user || !input.trim()) return
    setSending(true)
    const { tags, pings } = parseContent(input.trim())
    await supabase.from('chat_messages').insert({
      content: input.trim(),
      tags,
      pinged_usernames: pings,
      created_by: user.id,
    })
    setInput('')
    setSending(false)
    inputRef.current?.focus()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('id', id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // All unique tags across messages
  const allTags = Array.from(new Set(messages.flatMap((m) => m.tags ?? []))).sort()

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || m.content.toLowerCase().includes(q)
    const matchesTag = !activeTag || (m.tags ?? []).includes(activeTag)
    return matchesSearch && matchesTag
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Chat</h1>
        </div>
        <p className="text-sm text-zinc-400">Nutze #tags und @pings</p>
      </div>

      {/* Search + Tag filters */}
      <div className="flex-shrink-0 px-4 py-2 bg-zinc-950 border-b border-zinc-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Nachrichten durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700 text-xs text-zinc-300 border border-zinc-600 hover:border-zinc-500"
              >
                <X className="w-3 h-3" /> Alle
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  activeTag === tag
                    ? 'bg-amber-600/30 border-amber-500/60 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-amber-300 hover:border-amber-500/40'
                }`}
              >
                <Hash className="w-3 h-3" />{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <MessageSquare className="w-10 h-10 opacity-30" />
            <p className="text-sm">{search || activeTag ? 'Keine Treffer' : 'Noch keine Nachrichten'}</p>
          </div>
        )}

        {filtered.map((msg, idx) => {
          const prev = filtered[idx - 1]
          const sameUser = prev?.created_by === msg.created_by &&
            (new Date(msg.created_at).getTime() - new Date(prev?.created_at ?? 0).getTime()) < 5 * 60 * 1000
          const isOwn = msg.created_by === user?.id
          const isPinged = (msg.pinged_usernames ?? []).includes(user?.username ?? '')

          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-2.5 px-2 py-1 rounded-lg transition-colors ${
                isPinged ? 'bg-blue-900/20 border border-blue-700/30' : 'hover:bg-zinc-800/40'
              } ${sameUser ? 'mt-0' : 'mt-3'}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 ${sameUser ? 'opacity-0' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  msg.user?.role === 'gm' ? 'bg-amber-900 text-amber-300' : 'bg-zinc-700 text-zinc-300'
                }`}>
                  {msg.user?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {!sameUser && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`text-sm font-semibold ${msg.user?.role === 'gm' ? 'text-amber-400' : 'text-zinc-200'}`}>
                      {msg.user?.username ?? '?'}
                    </span>
                    {msg.user?.role === 'gm' && (
                      <span className="text-[10px] bg-amber-900/50 text-amber-400 border border-amber-700/40 px-1.5 rounded font-medium">GM</span>
                    )}
                    <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
                  </div>
                )}
                <p className="text-sm text-zinc-200 break-words leading-relaxed">
                  {renderMessage(msg.content)}
                </p>
              </div>

              {/* Delete button (own messages or GM) */}
              {(isOwn || user?.role === 'gm') && (
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-zinc-600 hover:text-red-400 transition-all"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 bg-zinc-950 border-t border-zinc-800">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben… #tag @spieler Enter zum Senden"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none min-h-[42px] max-h-32 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
            />
            <div className="absolute right-2 bottom-2 flex gap-1.5 text-zinc-600" aria-hidden>
              <Hash className="w-3.5 h-3.5" />
              <AtSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1.5 px-1">Enter senden · Shift+Enter neue Zeile</p>
      </div>
    </div>
  )
}
