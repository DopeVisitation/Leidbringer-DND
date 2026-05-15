'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import type { Note, NoteCategory } from '@/types'

const CATEGORIES: { value: NoteCategory; label: string; emoji: string }[] = [
  { value: 'general', label: 'Allgemein', emoji: '📝' },
  { value: 'session', label: 'Session', emoji: '🎯' },
  { value: 'character', label: 'Charakter', emoji: '⚔️' },
  { value: 'loot', label: 'Loot', emoji: '💰' },
  { value: 'npc', label: 'NPCs', emoji: '👤' },
]

interface NoteEditorProps {
  notes: Note[]
  onSave: (note: Partial<Note>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function NoteEditor({ notes, onSave, onDelete }: NoteEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)
  const [activeCategory, setActiveCategory] = useState<NoteCategory | 'all'>('all')
  const [draft, setDraft] = useState<Partial<Note> | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  useEffect(() => {
    if (selectedNote && selectedNote.id !== draft?.id) {
      setDraft(selectedNote)
    }
  }, [selectedId])

  const filtered = activeCategory === 'all'
    ? notes
    : notes.filter((n) => n.category === activeCategory)

  const handleNew = () => {
    const newNote: Partial<Note> = {
      title: 'Neue Notiz',
      content: '',
      category: activeCategory === 'all' ? 'general' : activeCategory,
    }
    setDraft(newNote)
    setSelectedId(null)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  const isDirty = draft && (
    !draft.id ||
    draft.title !== selectedNote?.title ||
    draft.content !== selectedNote?.content ||
    draft.category !== selectedNote?.category
  )

  return (
    <div className="flex h-full gap-0 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Left: note list */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-zinc-800">
        <div className="p-3 border-b border-zinc-800">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Neue Notiz
          </button>
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border transition-colors',
                activeCategory === 'all'
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
              )}
            >
              Alle
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveCategory(c.value)}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border transition-colors',
                  activeCategory === c.value
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {c.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => { setSelectedId(note.id); setDraft(note) }}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                selectedId === note.id
                  ? 'bg-zinc-800 border border-zinc-700'
                  : 'hover:bg-zinc-800/60'
              )}
            >
              <p className="text-sm font-medium text-zinc-200 truncate">{note.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{timeAgo(note.updated_at)}</p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">Keine Notizen</p>
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {draft ? (
          <>
            <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
              <input
                value={draft.title ?? ''}
                onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : d)}
                className="flex-1 bg-transparent text-base font-semibold text-zinc-100 focus:outline-none placeholder-zinc-600"
                placeholder="Titel..."
              />
              <select
                value={draft.category ?? 'general'}
                onChange={(e) => setDraft((d) => d ? { ...d, category: e.target.value as NoteCategory } : d)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 px-2 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                {isDirty && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    {saving ? 'Speichert...' : 'Speichern'}
                  </button>
                )}
                {draft.id && (
                  <button
                    onClick={() => { onDelete(draft.id!); setDraft(null); setSelectedId(null) }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={draft.content ?? ''}
              onChange={(e) => setDraft((d) => d ? { ...d, content: e.target.value } : d)}
              placeholder="Notiz schreiben..."
              className="flex-1 bg-transparent text-sm text-zinc-200 p-4 focus:outline-none resize-none leading-relaxed placeholder-zinc-600"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
            Wähle eine Notiz aus oder erstelle eine neue
          </div>
        )}
      </div>
    </div>
  )
}
