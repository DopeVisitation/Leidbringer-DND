'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Send, Search, Hash, AtSign, Trash2, X, Lock, ChevronDown, User } from 'lucide-react'
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

interface WhisperMessage {
  id: string
  from_user_id: string
  to_user_id: string
  content: string
  read_at: string | null
  created_at: string
  from_user?: { id: string; username: string; avatar_emoji?: string; role: string }
  to_user?: { id: string; username: string; avatar_emoji?: string; role: string }
}

interface Profile {
  id: string
  username: string
  display_name?: string
  avatar_emoji?: string
  role: string
}

function parseContent(text: string): { tags: string[]; pings: string[] } {
  const tags = (text.match(/#(\w+)/g) ?? []).map((t) => t.slice(1))
  const pings = (text.match(/@(\w+)/g) ?? []).map((p) => p.slice(1))
  return { tags, pings }
}

function renderMessage(content: string) {
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

function avatarLabel(p: Profile | { username: string; avatar_emoji?: string; role: string }) {
  return (p as any).avatar_emoji || p.username?.[0]?.toUpperCase() || '?'
}

export default function ChatPage() {
  const supabase = createClient()
  const { user } = useAuth()

  // Tab
  const [tab, setTab] = useState<'all' | 'whisper'>('all')

  // ── Public chat state ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const whisperInputRef = useRef<HTMLTextAreaElement>(null)

  // ── Whisper state ────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [whisperTarget, setWhisperTarget] = useState<Profile | null>(null)
  const [whisperMessages, setWhisperMessages] = useState<WhisperMessage[]>([])
  const [whisperInput, setWhisperInput] = useState('')
  const [whisperSending, setWhisperSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPicker, setShowPicker] = useState(false)
  const whisperBottomRef = useRef<HTMLDivElement>(null)

  // ── Load public messages ─────────────────────────────────────────────────────
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

  // ── Load profiles for whisper picker ────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, role')
      .neq('id', user.id)
      .then(({ data }) => {
        if (data) setProfiles(data as Profile[])
      })
  }, [user, supabase])

  // ── Load whisper messages ────────────────────────────────────────────────────
  const loadWhispers = useCallback(async (targetId?: string) => {
    if (!user) return
    const tid = targetId ?? whisperTarget?.id
    if (!tid) {
      // load all unread count
      const { count } = await supabase
        .from('whisper_messages')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .is('read_at', null)
      setUnreadCount(count ?? 0)
      return
    }
    const { data } = await supabase
      .from('whisper_messages')
      .select('*, from_user:profiles!whisper_messages_from_user_id_fkey(id,username,avatar_emoji,role), to_user:profiles!whisper_messages_to_user_id_fkey(id,username,avatar_emoji,role)')
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${tid}),and(from_user_id.eq.${tid},to_user_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(200)
    if (data) setWhisperMessages(data as WhisperMessage[])

    // Mark unread as read
    await supabase
      .from('whisper_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('to_user_id', user.id)
      .eq('from_user_id', tid)
      .is('read_at', null)

    // Refresh unread count (all)
    const { count } = await supabase
      .from('whisper_messages')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .is('read_at', null)
    setUnreadCount(count ?? 0)
  }, [user, whisperTarget?.id, supabase])

  // Initial unread count
  useEffect(() => {
    if (user) loadWhispers()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when target changes
  useEffect(() => {
    if (whisperTarget) loadWhispers(whisperTarget.id)
  }, [whisperTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll whisper thread
  useEffect(() => {
    whisperBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [whisperMessages])

  // Realtime whispers
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel('whisper_messages_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whisper_messages' }, () => {
        loadWhispers(whisperTarget?.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, whisperTarget?.id, loadWhispers, supabase])

  // ── Public chat actions ──────────────────────────────────────────────────────
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Whisper actions ──────────────────────────────────────────────────────────
  const handleSendWhisper = async () => {
    if (!user || !whisperTarget || !whisperInput.trim()) return
    setWhisperSending(true)
    await supabase.from('whisper_messages').insert({
      from_user_id: user.id,
      to_user_id: whisperTarget.id,
      content: whisperInput.trim(),
    })
    setWhisperInput('')
    setWhisperSending(false)
    whisperInputRef.current?.focus()
  }

  const handleWhisperKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendWhisper() }
  }

  const handleDeleteWhisper = async (id: string) => {
    await supabase.from('whisper_messages').delete().eq('id', id)
    setWhisperMessages(prev => prev.filter(m => m.id !== id))
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const allTags = Array.from(new Set(messages.flatMap((m) => m.tags ?? []))).sort()
  const filtered = messages.filter((m) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || m.content.toLowerCase().includes(q)
    const matchesTag = !activeTag || (m.tags ?? []).includes(activeTag)
    return matchesSearch && matchesTag
  })

  // Group whisper conversations: one entry per other user
  const whisperConversations = profiles.map(p => {
    const msgs = whisperMessages.filter(
      m => (m.from_user_id === p.id || m.to_user_id === p.id)
    )
    return { profile: p, lastMsg: msgs[msgs.length - 1] ?? null }
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-zinc-100">Chat</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              tab === 'all' ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => { setTab('whisper'); loadWhispers(whisperTarget?.id) }}
            className={`relative px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === 'whisper' ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Flüstern
            {unreadCount > 0 && (
              <span className="text-[10px] leading-none font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── PUBLIC CHAT ───────────────────────────────────────────────────────── */}
      {tab === 'all' && (
        <>
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
                  <div className={`flex-shrink-0 w-8 h-8 ${sameUser ? 'opacity-0' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      msg.user?.role === 'gm' ? 'bg-amber-900 text-amber-300' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {msg.user?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  </div>
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
        </>
      )}

      {/* ── WHISPER TAB ───────────────────────────────────────────────────────── */}
      {tab === 'whisper' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: conversation list */}
          <div className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Spieler</p>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {profiles.length === 0 && (
                <p className="text-xs text-zinc-600 px-3 py-4 text-center">Keine anderen Spieler</p>
              )}
              {profiles.map(p => {
                const conv = whisperConversations.find(c => c.profile.id === p.id)
                const isActive = whisperTarget?.id === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setWhisperTarget(p)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-amber-600/15 border-r-2 border-amber-500' : 'hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      p.role === 'gm' ? 'bg-amber-900 text-amber-300' : 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {avatarLabel(p)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-amber-400' : 'text-zinc-200'}`}>
                        {p.display_name || p.username}
                      </p>
                      {conv?.lastMsg && (
                        <p className="text-[10px] text-zinc-600 truncate">
                          {conv.lastMsg.content}
                        </p>
                      )}
                    </div>
                    {p.role === 'gm' && (
                      <span className="text-[9px] bg-amber-900/50 text-amber-400 px-1 rounded">GM</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: thread */}
          <div className="flex-1 flex flex-col min-w-0">
            {!whisperTarget ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
                <Lock className="w-10 h-10 opacity-30" />
                <p className="text-sm">Wähle einen Spieler für ein Flüstergespräch</p>
                <p className="text-xs text-zinc-700">Nur ihr zwei könnt diese Nachrichten sehen</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex items-center gap-2 flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    whisperTarget.role === 'gm' ? 'bg-amber-900 text-amber-300' : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {avatarLabel(whisperTarget)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{whisperTarget.display_name || whisperTarget.username}</p>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Privates Gespräch
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                  {whisperMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2">
                      <Lock className="w-8 h-8 opacity-30" />
                      <p className="text-sm">Noch keine Nachrichten</p>
                    </div>
                  )}

                  {whisperMessages.map((msg, idx) => {
                    const prev = whisperMessages[idx - 1]
                    const isOwn = msg.from_user_id === user?.id
                    const sameUser = prev?.from_user_id === msg.from_user_id &&
                      (new Date(msg.created_at).getTime() - new Date(prev?.created_at ?? 0).getTime()) < 5 * 60 * 1000

                    const senderProfile = isOwn ? null : whisperTarget

                    return (
                      <div
                        key={msg.id}
                        className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${sameUser ? 'mt-0.5' : 'mt-3'}`}
                      >
                        {/* Avatar (only for others, only first of group) */}
                        {!isOwn && (
                          <div className={`flex-shrink-0 w-7 h-7 ${sameUser ? 'opacity-0' : ''}`}>
                            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                              {senderProfile ? avatarLabel(senderProfile) : '?'}
                            </div>
                          </div>
                        )}

                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!sameUser && !isOwn && (
                            <p className="text-[11px] text-zinc-500 mb-0.5 px-1">{whisperTarget.display_name || whisperTarget.username}</p>
                          )}
                          <div className={`group/bubble relative px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                            isOwn
                              ? 'bg-amber-600/80 text-white rounded-br-sm'
                              : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                          }`}>
                            {msg.content}
                            {/* Delete button */}
                            {isOwn && (
                              <button
                                onClick={() => handleDeleteWhisper(msg.id)}
                                className="absolute -top-1.5 -left-1.5 opacity-0 group-hover/bubble:opacity-100 w-5 h-5 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-all"
                                title="Löschen"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {!sameUser && (
                            <p className="text-[10px] text-zinc-700 mt-0.5 px-1">{timeAgo(msg.created_at)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={whisperBottomRef} />
                </div>

                {/* Whisper input */}
                <div className="flex-shrink-0 px-4 py-3 bg-zinc-950 border-t border-zinc-800">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={whisperInputRef}
                        rows={1}
                        value={whisperInput}
                        onChange={(e) => setWhisperInput(e.target.value)}
                        onKeyDown={handleWhisperKeyDown}
                        placeholder={`Flüstern an ${whisperTarget.display_name || whisperTarget.username}…`}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none min-h-[42px] max-h-32 overflow-y-auto"
                        style={{ height: 'auto' }}
                        onInput={(e) => {
                          const el = e.currentTarget
                          el.style.height = 'auto'
                          el.style.height = Math.min(el.scrollHeight, 128) + 'px'
                        }}
                      />
                      <Lock className="absolute right-3 bottom-3 w-3.5 h-3.5 text-zinc-600" />
                    </div>
                    <button
                      onClick={handleSendWhisper}
                      disabled={!whisperInput.trim() || whisperSending}
                      className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1.5 px-1">
                    🔒 Nur {whisperTarget.display_name || whisperTarget.username} kann diese Nachrichten sehen
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
