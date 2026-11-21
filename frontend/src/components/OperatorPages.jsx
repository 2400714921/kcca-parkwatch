import React, { useEffect } from 'react'
import { Icon, Button, EmptyState, classifyAvailability } from './ui'
import { getStationCode } from '../utils/stationCodes'

export function Dashboard({
  areas,
  availability,
  auth,
  onSelect,
  onRegisterClick,
  onViewFacilities,
}) {
  const decorated = areas.map((area) => {
    const entry = availability[area.id] || { total: 0, free: 0, occupied: 0, hasLive: false, updatedAt: null }
    return { area, entry, status: classifyAvailability(entry) }
  })

  const totals = decorated.reduce(
    (acc, d) => ({
      spots: acc.spots + (d.entry.total || 0),
      free: acc.free + (d.entry.hasLive ? d.entry.free : 0),
      occupied: acc.occupied + (d.entry.hasLive ? d.entry.occupied : 0),
      live: acc.live + (d.entry.hasLive && d.entry.total > 0 ? 1 : 0),
    }),
    { spots: 0, free: 0, occupied: 0, live: 0 }
  )

  const liveCapacity = totals.free + totals.occupied
  const overallOccPct = liveCapacity > 0 ? Math.round((totals.occupied / liveCapacity) * 100) : 0

  // Status breakdown for SVG Donut chart
  const statusCounts = decorated.reduce(
    (acc, d) => {
      if (!d.entry.hasLive || d.entry.total === 0) acc.idle += 1
      else if (d.status === 'high') acc.high += 1
      else if (d.status === 'medium') acc.medium += 1
      else acc.low += 1
      return acc
    },
    { high: 0, medium: 0, low: 0, idle: 0 }
  )

  // Division capacity breakdown
  const divisionMap = new Map()
  decorated.forEach(({ area, entry }) => {
    const div = (area.location || '').split(/[,•]/)[0]?.trim() || 'Central Division'
    const prev = divisionMap.get(div) || { total: 0, occupied: 0, lots: 0 }
    divisionMap.set(div, {
      total: prev.total + (entry.total || 0),
      occupied: prev.occupied + (entry.hasLive ? entry.occupied || 0 : 0),
      lots: prev.lots + 1,
    })
  })
  const divisions = [...divisionMap.entries()].sort((a, b) => b[1].total - a[1].total)

  // Donut SVG math
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const totalLots = decorated.length || 1
  const segments = [
    { key: 'high', label: 'Plenty Free', count: statusCounts.high, color: '#15803d', dot: 'bg-emerald-700' },
    { key: 'medium', label: 'Filling Up', count: statusCounts.medium, color: '#f59e0b', dot: 'bg-amber-500' },
    { key: 'low', label: 'Full / Critical', count: statusCounts.low, color: '#dc2626', dot: 'bg-red-600' },
    { key: 'idle', label: 'Awaiting Feed', count: statusCounts.idle, color: '#94a3b8', dot: 'bg-slate-400' },
  ]
  let runningOffset = 0

  const isOwner = auth?.role === 'operator'

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-start justify-between gap-space-sm flex-wrap">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-slate-900 dark:text-white font-bold tracking-tight">
            Operations Dashboard
          </h1>
          <p className="font-body-md text-body-md text-slate-600 dark:text-slate-400 mt-0.5">
            {isOwner
              ? 'Capacity metrics, occupancy, and live feed status for your parking facilities.'
              : 'City-wide capacity metrics, occupancy distribution, and live feed status.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {onViewFacilities && (
            <Button variant="secondary" onClick={onViewFacilities}>
              <Icon name="local_parking" size={18} />
              {auth?.role === 'operator' ? 'My Parking Facilities' : 'Parking Facilities'}
            </Button>
          )}
          <Button onClick={onRegisterClick}>
            <Icon name="add" size={18} />
            Register Parking Area
          </Button>
        </div>
      </div>

      {/* 4 KPI Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <SummaryTile
          icon="domain"
          label="Facilities"
          value={areas.length}
          sub="Registered lots"
          tone="text-slate-900 dark:text-white"
          wrap="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
        />
        <SummaryTile
          icon="local_parking"
          label="Marked Bays"
          value={totals.spots.toLocaleString()}
          sub={`${totals.free.toLocaleString()} free now`}
          tone="text-slate-900 dark:text-white"
          wrap="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
        />
        <SummaryTile
          icon="videocam"
          label="Reporting Live"
          value={`${totals.live}/${areas.length}`}
          sub="Active camera feeds"
          tone="text-emerald-700 dark:text-emerald-400"
          wrap="bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
        />
        <SummaryTile
          icon="pie_chart"
          label={isOwner ? 'My Occupancy' : 'City Occupancy'}
          value={`${overallOccPct}%`}
          sub={`${totals.occupied.toLocaleString()} bays occupied`}
          tone="text-amber-700 dark:text-amber-400"
          wrap="bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
        />
      </div>

      {areas.length === 0 ? (
        <EmptyState
          title="No parking areas yet"
          body="Register a parking facility, then mark its bays over camera footage to publish live availability and metrics."
          action={
            <Button onClick={onRegisterClick} className="mt-space-xs">
              <Icon name="add" size={18} />
              Register Your First Area
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left: Occupancy by Facility Bar Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Occupancy by Facility
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Occupied vs. total marked bays across monitored locations
                </p>
              </div>
              {onViewFacilities && (
                <button
                  type="button"
                  onClick={onViewFacilities}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Open Directory →
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              {decorated.map(({ area, entry, status }) => {
                const occPct = entry.total > 0 ? Math.round((entry.occupied / entry.total) * 100) : 0
                const barColor =
                  !entry.hasLive || entry.total === 0
                    ? 'bg-slate-300 dark:bg-slate-700'
                    : status === 'high'
                    ? 'bg-emerald-600'
                    : status === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-red-600'

                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => onSelect(area)}
                    className="w-full text-left group cursor-pointer"
                    title={`Open live monitor for ${area.name}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {getStationCode(area)}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate transition-colors">
                          {area.name}
                        </span>
                      </div>
                      <span className="tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                        <strong className="text-slate-900 dark:text-white">{entry.hasLive ? entry.occupied : '--'}</strong>
                        {' / '}
                        {entry.total} ({entry.hasLive ? `${occPct}%` : 'Idle'})
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${entry.hasLive ? occPct : 0}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Status Donut Chart & Division Capacity */}
          <div className="lg:col-span-5 flex flex-col gap-space-lg">
            {/* Status Donut Chart */}
            <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Facility Status Distribution
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isOwner
                    ? `Live availability tiers across your ${areas.length} ${areas.length === 1 ? 'facility' : 'facilities'}`
                    : `Live availability tiers across ${areas.length} facilities`}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    {segments.map((seg) => {
                      if (seg.count === 0) return null
                      const dash = (seg.count / totalLots) * circumference
                      const offset = runningOffset
                      runningOffset += dash
                      return (
                        <circle
                          key={seg.key}
                          cx="56"
                          cy="56"
                          r={radius}
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset}
                        />
                      )
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
                      {areas.length}
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-slate-400 mt-0.5">
                      Lots
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  {segments.map((seg) => (
                    <div key={seg.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${seg.dot}`} />
                        {seg.label}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {seg.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Division Capacity Breakdown */}
            <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex flex-col gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Capacity by Division
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Marked parking bays across Kampala zones
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {divisions.map(([div, data]) => {
                  const share = totals.spots > 0 ? Math.round((data.total / totals.spots) * 100) : 0
                  return (
                    <div key={div} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {div}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                          <strong className="text-slate-900 dark:text-white">{data.total}</strong> bays ({data.lots} {data.lots === 1 ? 'lot' : 'lots'})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 dark:bg-emerald-500 rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ icon, label, value, sub, tone, wrap }) {
  return (
    <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex items-center justify-between gap-space-sm">
      <div className="flex flex-col min-w-0">
        <span className="font-label-caps text-label-caps text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <span className={`font-stat-display text-3xl sm:text-4xl font-extrabold leading-none mt-space-xs tabular-nums ${tone}`}>
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate tabular-nums">
            {sub}
          </span>
        )}
      </div>
      <div className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${wrap}`}>
        <Icon name={icon} size={22} />
      </div>
    </div>
  )
}

export function RegisterAreaModal({ isOpen, onClose, form, setForm, onSubmit }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const invalid = form.name.trim().length > 0 && form.name.trim().length < 3

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      setForm((prev) => ({ ...prev, imageUrl: evt.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const fieldClass =
    'w-full h-12 px-space-md rounded-lg bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-body-md text-body-md focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all'

  return (
    <div
      data-testid="register-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Tricolor top border accent */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-emerald-700" />
          <div className="w-1/3 bg-amber-500" />
          <div className="w-1/3 bg-red-600" />
        </div>

        <div className="p-space-xl flex flex-col gap-space-lg">
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex flex-col gap-space-xs min-w-0">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400">
                Civic Infrastructure
              </span>
              <h2 className="font-headline-md text-headline-md text-slate-900 dark:text-white font-bold">
                Register a Parking Area
              </h2>
              <p className="font-body-sm text-body-sm text-slate-500 dark:text-slate-400">
                Add a new municipal parking lot or bay deck to the live telemetry mesh.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <label
                htmlFor="modalAreaName"
                className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
              >
                Facility Name <span className="text-emerald-700 dark:text-emerald-400">*</span>
              </label>
              <input
                id="modalAreaName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., City Square (Constitution Square)"
                className={`${fieldClass} ${invalid ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-700 dark:focus:border-emerald-500'}`}
                autoFocus
              />
              {invalid && (
                <p className="font-body-sm text-body-sm text-red-600 dark:text-red-400">Use at least 3 characters.</p>
              )}
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                htmlFor="modalAreaLocation"
                className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
              >
                Location / Street Address
              </label>
              <input
                id="modalAreaLocation"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Central Division, Kampala Road / Speke Rd"
                className={`${fieldClass} border-slate-200 dark:border-slate-700 focus:border-emerald-700 dark:focus:border-emerald-500`}
              />
              <p className="font-body-sm text-body-sm text-slate-500 dark:text-slate-400">
                Format as <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">Zone, Street</code> — the first segment becomes its filter chip.
              </p>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                htmlFor="modalAreaRate"
                className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
              >
                Rate Per Hour (UGX)
              </label>
              <input
                id="modalAreaRate"
                value={form.hourlyRate || ''}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                placeholder="e.g., 2000 or UGX 2,500 / hr"
                className={`${fieldClass} border-slate-200 dark:border-slate-700 focus:border-emerald-700 dark:focus:border-emerald-500`}
              />
              <p className="font-body-sm text-body-sm text-slate-500 dark:text-slate-400">
                Official municipal hourly rate displayed to motorists on civic facility cards.
              </p>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label
                htmlFor="modalAreaCapacity"
                className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold"
              >
                Nominal Capacity (informational)
              </label>
              <input
                id="modalAreaCapacity"
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="e.g., 50"
                className={`${fieldClass} border-slate-200 dark:border-slate-700 focus:border-emerald-700 dark:focus:border-emerald-500`}
              />
              <p className="font-body-sm text-body-sm text-slate-500 dark:text-slate-400">
                Informational reference. Live occupancy is derived from your calibrated camera spots.
              </p>
            </div>

            {/* Upload Facility Photo */}
            <div className="flex flex-col gap-space-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold">
                Facility / Spot Photo (shows motorists what it looks like)
              </label>
              <div className="flex items-center gap-4">
                {form.imageUrl ? (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs">
                    <img src={form.imageUrl} alt="Facility preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-0.5 rounded-full text-xs cursor-pointer"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-slate-50 dark:bg-slate-850">
                    <Icon name="upload_file" size={20} />
                    <span className="text-[10px] mt-0.5">No Photo</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 grow">
                  <input
                    type="file"
                    id="facilityPhotoUpload"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="facilityPhotoUpload"
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer w-fit flex items-center gap-1.5 transition-colors"
                  >
                    <Icon name="upload_file" size={16} />
                    <span>{form.imageUrl ? 'Change Photo' : 'Upload Facility Photo'}</span>
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG, or WebP. Motorists see this photo in the civic directory.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={onClose}>
              <Icon name="close" size={18} />
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!form.name.trim() || invalid}>
              <Icon name="check" size={18} />
              Register Parking Area
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Backward-compatible alias for any direct imports
export const CreateAreaForm = RegisterAreaModal
