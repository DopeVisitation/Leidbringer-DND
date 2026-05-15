import { RulesSearch } from '@/components/rules/RulesSearch'

export default function RulesPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">DnD 5e Grundregeln</h1>
        <p className="text-sm text-zinc-400">Schnell nachschlagen während der Session</p>
      </div>
      <RulesSearch />
    </div>
  )
}
