'use client'

import { useState } from 'react'
import { RulesSearch } from '@/components/rules/RulesSearch'
import { BookOpen, FileText, Search } from 'lucide-react'

type RulesTab = 'search' | 'pdf'

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<RulesTab>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [pdfSearch, setPdfSearch] = useState('')

  const handlePdfSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (pdfSearch.trim()) {
      setSearchQuery(pdfSearch.trim())
      setActiveTab('search')
    }
  }

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
          <RulesSearch initialQuery={searchQuery} />
        </div>
      )}

      {activeTab === 'pdf' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* PDF search bar */}
          <form onSubmit={handlePdfSearch} className="flex-shrink-0 px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Im Regelwerk suchen… (Strg+F für PDF-Suche im Browser)"
                value={pdfSearch}
                onChange={e => setPdfSearch(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button type="submit"
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium text-white transition-colors">
              Suchen
            </button>
            <p className="hidden md:flex items-center text-xs text-zinc-600 whitespace-nowrap">
              Öffnet Regelsuche
            </p>
          </form>

          {/* PDF iframe */}
          <div className="flex-1 relative">
            <iframe
              src="/player-basic-rules.pdf"
              className="absolute inset-0 w-full h-full border-0"
              title="DnD 5e Player's Basic Rules"
            />
          </div>
        </div>
      )}
    </div>
  )
}
