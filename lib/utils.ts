import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import type { ResponseStatus, SessionResponse } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd. MMMM yyyy', { locale: de })
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'dd.MM.yyyy · HH:mm', { locale: de })
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'HH:mm', { locale: de })
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: de })
}

export function getSessionColor(accepted: number, total: number): string {
  if (total === 0) return 'border-zinc-600 bg-zinc-800/50'
  const ratio = accepted / total
  if (ratio >= 1) return 'border-emerald-600 bg-emerald-950/40'
  if (ratio >= 0.75) return 'border-green-500 bg-green-950/30'
  if (ratio >= 0.5) return 'border-yellow-500 bg-yellow-950/30'
  if (ratio >= 0.25) return 'border-red-500 bg-red-950/30'
  return 'border-zinc-600 bg-zinc-800/50'
}

export function getSessionBadgeColor(accepted: number, total: number): string {
  if (total === 0) return 'bg-zinc-700 text-zinc-300'
  const ratio = accepted / total
  if (ratio >= 1) return 'bg-emerald-700 text-emerald-100'
  if (ratio >= 0.75) return 'bg-green-700 text-green-100'
  if (ratio >= 0.5) return 'bg-yellow-700 text-yellow-100'
  if (ratio >= 0.25) return 'bg-red-700 text-red-100'
  return 'bg-zinc-700 text-zinc-300'
}

export function countAccepted(responses: SessionResponse[]): number {
  return responses.filter((r) => r.status === 'accepted').length
}

export function statusLabel(status: ResponseStatus): string {
  const map: Record<ResponseStatus, string> = {
    accepted: 'Zusage',
    maybe: 'Vielleicht',
    declined: 'Absage',
  }
  return map[status]
}

export function statusColor(status: ResponseStatus): string {
  const map: Record<ResponseStatus, string> = {
    accepted: 'text-emerald-400',
    maybe: 'text-yellow-400',
    declined: 'text-red-400',
  }
  return map[status]
}
