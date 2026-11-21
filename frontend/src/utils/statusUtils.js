/**
 * Utility helpers for facility availability classification, tone styling, and relative time formatting.
 * Supports both light mode and dark mode styling.
 */

const TONES = {
  high: {
    label: 'Plenty Free',
    bar: 'bg-emerald-600',
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-xs',
    figure: 'text-emerald-700 dark:text-emerald-400',
    note: 'text-emerald-600 dark:text-emerald-400',
    gauge: 'bg-emerald-600',
  },
  medium: {
    label: 'Filling Up',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 shadow-xs',
    figure: 'text-amber-700 dark:text-amber-400',
    note: 'text-amber-700 dark:text-amber-400',
    gauge: 'bg-amber-500',
  },
  low: {
    label: 'Almost Full',
    bar: 'bg-rose-600',
    dot: 'bg-rose-600',
    chip: 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 shadow-xs',
    figure: 'text-rose-700 dark:text-rose-400',
    note: 'text-rose-600 dark:text-rose-400',
    gauge: 'bg-rose-600',
  },
  full: {
    label: 'Full',
    bar: 'bg-red-700',
    dot: 'bg-red-700',
    chip: 'bg-red-700 dark:bg-red-900 border-red-800 dark:border-red-700 text-white shadow-xs',
    figure: 'text-red-700 dark:text-red-400',
    note: 'text-red-600 dark:text-red-400',
    gauge: 'bg-red-700',
  },
  offline: {
    label: 'Awaiting Sync',
    bar: 'bg-slate-300 dark:bg-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
    chip: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300',
    figure: 'text-slate-400 dark:text-slate-500',
    note: 'text-slate-500 dark:text-slate-400',
    gauge: 'bg-slate-300 dark:bg-slate-700',
  },
  none: {
    label: 'Not Set Up',
    bar: 'bg-slate-200 dark:bg-slate-800',
    dot: 'bg-slate-300 dark:bg-slate-600',
    chip: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
    figure: 'text-slate-400 dark:text-slate-500',
    note: 'text-slate-500 dark:text-slate-400',
    gauge: 'bg-slate-200 dark:bg-slate-800',
  },
}

export const toneOf = (status) => TONES[status] || TONES.none

/**
 * Availability classification. `hasLive` distinguishes "monitored and empty"
 * from "never monitored", which previously both rendered as free spots.
 */
export function classifyAvailability({ total, free, hasLive }) {
  if (!total) return 'none'
  if (!hasLive) return 'offline'
  const pct = free / total
  if (pct > 0.4) return 'high'
  if (pct > 0.15) return 'medium'
  return free > 0 ? 'low' : 'full'
}

/** Relative "45s ago" formatter used by live-data footers. */
export function timeAgo(ms) {
  if (!ms) return 'never'
  const secs = Math.round((Date.now() - ms) / 1000)
  if (secs < 0) return 'just now'
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`
  return `${Math.round(secs / 86400)}d ago`
}
