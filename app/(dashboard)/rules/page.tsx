'use client'

import { useState } from 'react'
import { RulesSearch } from '@/components/rules/RulesSearch'
import { BookOpen, FileText } from 'lucide-react'

type RulesTab = 'search' | 'pdf'

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<RulesTab>('search')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex-shrink-0">
        <h1 className="text-xl font-bold text-zinc-100">DnD 5e Grundregeln</h1>
        <p className="text-sm text-zinc-400">Schnell nachschlagen während der Session</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'search'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Regelsuche
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'pdf'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Player&apos;s Handbook PDF
        </button>
      </div>

      {/* Content */}
      {activeTab === 'search' && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full space-y-4">
          <RulesSearch />
        </div>
      )}

      {activeTab === 'pdf' && (
        <div className="flex-1 relative">
          <iframe
            src="/player-basic-rules.pdf"
            className="absolute inset-0 w-full h-full border-0"
            title="DnD 5e Player's Basic Rules"
          />
        </div>
      )}
    </div>
  )
}
