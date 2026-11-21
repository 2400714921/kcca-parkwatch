import React, { useState } from 'react'
import { Icon, Button, StatusChip, Gauge, classifyAvailability, timeAgo } from './ui'
import { getStationCode } from '../utils/stationCodes'

export default function MonitorWorkspace({
  area,
  areas = [],
  availability = {},
  auth,
  onSelectArea,
  onOpenRegisterModal,
  onDeleteArea,
  onClearAreaSpots,
  backendHealth,
  videoStream,
  videoMeta,
  onClearVideo,
  isPlaying,
  spots,
  occupiedSpots,
  current,
  history,
  currentTime,
  videoDuration,
  detectIntervalMs,
  markingMode,
  onToggleMarking,
  onPlayPause,
  onUploadClick,
  onClearSpots,
  onDeleteSpot,
  onIntervalChange,
  onBack,
  formatTime,
  canvasRef,
  onMouseDown,
  onSeek,
  onScanFrame,
  onSaveVideoUrl,
  videoUploadStatus,
  onEditArea,
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [hubQuery, setHubQuery] = useState('')
  const [hubViewMode, setHubViewMode] = useState('grid')
  const [sharedUrlInput, setSharedUrlInput] = useState(area?.videoUrl || '')

  const filteredHubAreas = areas.filter((a) => {
    const q = hubQuery.trim().toLowerCase()
    if (!q) return true
    return (
      (a.name || '').toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q) ||
      getStationCode(a).toLowerCase().includes(q)
    )
  })

  // Fallback hub view if no specific area is selected
  if (!area) {
    const hubStats = areas.reduce(
      (acc, a) => {
        const entry = availability[a.id] || { total: (a.spots || []).length, free: 0, occupied: 0, hasLive: false }
        acc.totalBays += Number(entry.total) || 0
        if (entry.hasLive && entry.total > 0) {
          acc.liveFeeds += 1
          acc.freeNow += Number(entry.free) || 0
        }
        return acc
      },
      { totalBays: 0, liveFeeds: 0, freeNow: 0 }
    )

    return (
      <div className="flex flex-col gap-space-lg">
        <div className="flex items-start justify-between gap-space-sm flex-wrap">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-slate-900 dark:text-white font-bold tracking-tight">
              {auth?.role === 'operator' ? 'My Parking Facilities' : 'Parking Facilities'}
            </h1>
            <p className="font-body-md text-body-md text-slate-600 dark:text-slate-400 mt-0.5">
              Select a municipal facility to stream footage, calibrate bays, and monitor live bay occupancy.
            </p>
          </div>
          {onOpenRegisterModal && (
            <Button onClick={onOpenRegisterModal}>
              <Icon name="add" size={18} />
              Register New Area
            </Button>
          )}
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Facilities
              </span>
              <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                {areas.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Registered lots</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Icon name="domain" size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Marked Bays
              </span>
              <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                {hubStats.totalBays.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Total capacity</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Icon name="local_parking" size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Feeds
              </span>
              <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {hubStats.liveFeeds}/{areas.length}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Active cameras</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Icon name="videocam" size={20} />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Free Bays Now
              </span>
              <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                {hubStats.freeNow.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Across live lots</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Icon name="verified" size={20} />
            </div>
          </div>
        </div>

        {areas.length === 0 ? (
          <div className="bg-white dark:bg-[#151f30] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Icon name="videocam" size={28} />
            </div>
            <div>
              <h3 className="font-headline-sm text-slate-900 dark:text-white font-bold">
                No Facilities Registered Yet
              </h3>
              <p className="font-body-md text-slate-500 dark:text-slate-400 max-w-md mt-1">
                Register a parking lot or on-street zone first, then launch its live camera monitor.
              </p>
            </div>
            {onOpenRegisterModal && (
              <Button onClick={onOpenRegisterModal}>
                <Icon name="add" size={18} />
                Register Parking Area
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-space-md">
            {/* Search & Grid/Table Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={hubQuery}
                  onChange={(e) => setHubQuery(e.target.value)}
                  placeholder="Search facilities by name or location..."
                  data-testid="hub-search-input"
                  className="w-full h-10 pl-9 pr-8 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:border-emerald-600 focus:outline-none"
                />
                <Icon name="search" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {hubQuery && (
                  <button
                    type="button"
                    onClick={() => setHubQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <Icon name="close" size={15} />
                  </button>
                )}
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#273549] bg-white dark:bg-[#151f30] p-0.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHubViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    hubViewMode === 'grid'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon name="grid_view" size={15} />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHubViewMode('table')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    hubViewMode === 'table'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon name="table_rows" size={15} />
                  <span>Table</span>
                </button>
              </div>
            </div>

            {hubViewMode === 'table' ? (
              <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#273549] bg-slate-50 dark:bg-[#0c1220] text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">Facility</th>
                      <th className="py-3 px-4 font-semibold">Location</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Availability</th>
                      <th className="py-3 px-4 font-semibold">Rate</th>
                      <th className="py-3 px-4 font-semibold">Updated</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3d]">
                    {filteredHubAreas.map((a) => {
                      const entry = availability[a.id] || { total: (a.spots || []).length, free: 0, occupied: 0, hasLive: false, updatedAt: null }
                      const status = classifyAvailability(entry)
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{a.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{getStationCode(a)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                            {a.location || 'Kampala'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <StatusChip status={status} />
                          </td>
                          <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {entry.hasLive ? entry.free : '--'}
                            </span>
                            <span className="text-slate-400"> / {entry.total} bays</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-amber-700 dark:text-amber-400">
                            {a.hourlyRate || 'UGX 2,000 / hr'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                            {entry.hasLive ? timeAgo(entry.updatedAt) : 'Awaiting footage'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {(a.spots || []).length > 0 && onClearAreaSpots && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Clear all ${(a.spots || []).length} marked bays for ${a.name}?`)) {
                                      onClearAreaSpots(a.id)
                                    }
                                  }}
                                  title={`Clear all ${(a.spots || []).length} marked bays`}
                                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:text-red-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Icon name="delete_sweep" size={16} />
                                </button>
                              )}
                              {onEditArea && (
                                <button
                                  onClick={() => onEditArea(a)}
                                  title="Edit facility info, rates & photo"
                                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Icon name="edit" size={15} />
                                </button>
                              )}
                              {onDeleteArea && (
                                <button
                                  onClick={() => onDeleteArea(a.id)}
                                  title="Delete facility"
                                  className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Icon name="delete" size={16} />
                                </button>
                              )}
                              <Button size="sm" onClick={() => onSelectArea(a)}>
                                <Icon name="play_circle" size={15} />
                                Monitor
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
                {filteredHubAreas.map((a) => {
                  const entry = availability[a.id] || { total: (a.spots || []).length, free: 0, occupied: 0, hasLive: false, updatedAt: null }
                  const status = classifyAvailability(entry)
                  const occPct = entry.total ? Math.round((entry.occupied / entry.total) * 100) : 0
                  return (
                    <article
                      key={a.id}
                      className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs hover:shadow-md p-space-lg flex flex-col justify-between gap-space-md transition-all"
                    >
                      <div className="flex flex-col gap-space-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-headline-sm text-slate-900 dark:text-white font-bold truncate">
                              {a.name}
                            </h3>
                            {a.location && (
                              <p className="font-body-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <Icon name="place" size={15} />
                                <span className="truncate">{a.location}</span>
                              </p>
                            )}
                          </div>
                          <StatusChip status={status} />
                        </div>

                        <div className="bg-slate-50 dark:bg-[#0c1220] border border-slate-100 dark:border-[#1e2a3d] p-space-md rounded-lg flex flex-col gap-space-xs">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-2xl font-extrabold text-slate-900 dark:text-white leading-none tabular-nums">
                                {entry.hasLive ? entry.free : '--'}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">free now</span>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                              {entry.occupied} / {entry.total}
                            </span>
                          </div>
                          <Gauge percent={occPct} status={status} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1e2a3d]">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.hasLive ? `Updated ${timeAgo(entry.updatedAt)}` : 'Awaiting footage'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {(a.spots || []).length > 0 && onClearAreaSpots && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Clear all ${(a.spots || []).length} marked bays for ${a.name}?`)) {
                                  onClearAreaSpots(a.id)
                                }
                              }}
                              title={`Clear all ${(a.spots || []).length} marked bays`}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:text-red-600 flex items-center justify-center cursor-pointer"
                            >
                              <Icon name="delete_sweep" size={16} />
                            </button>
                          )}
                          {onEditArea && (
                            <button
                              onClick={() => onEditArea(a)}
                              title="Edit facility info, rates & photo"
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 flex items-center justify-center cursor-pointer"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                          )}
                          {onDeleteArea && (
                            <button
                              onClick={() => onDeleteArea(a.id)}
                              title="Delete facility"
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 flex items-center justify-center cursor-pointer"
                            >
                              <Icon name="delete" size={16} />
                            </button>
                          )}
                          <Button size="sm" onClick={() => onSelectArea(a)}>
                            <Icon name="play_circle" size={15} />
                            Monitor
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const occupiedCount = occupiedSpots.size
  const totalCount = spots.length
  const freeCount = totalCount - occupiedCount
  const occupiedPct = totalCount ? Math.round((occupiedCount / totalCount) * 100) : 0
  const status = classifyAvailability({ total: totalCount, free: freeCount, hasLive: Boolean(videoStream) })

  const handleScrubberMouseDown = (e) => {
    if (!onSeek || !videoDuration) return
    const scrubber = e.currentTarget
    const updateSeek = (clientX) => {
      const rect = scrubber.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onSeek(pct * videoDuration)
    }
    updateSeek(e.clientX)

    const handleMouseMove = (moveEvt) => {
      updateSeek(moveEvt.clientX)
    }
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className="flex flex-col gap-space-lg">
      {/* ---- Workspace header with Facility Switcher ---- */}
      <div className="flex items-start justify-between gap-space-md flex-wrap bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg transition-colors relative z-20">
        <div className="flex items-start gap-space-md min-w-0">
          <button
            onClick={onBack}
            className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            title="Back to dashboard"
          >
            <Icon name="arrow_back" size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-label-caps text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider">
                Monitoring Session
              </span>

              {/* Facility Switcher Dropdown Trigger */}
              {areas.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setSwitcherOpen(!switcherOpen)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <span>Switch Facility</span>
                    <Icon name="expand_more" size={16} />
                  </button>

                  {switcherOpen && (
                    <div
                      className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                      onClick={() => setSwitcherOpen(false)}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        Select Facility to Monitor
                      </div>
                      {areas.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => onSelectArea(opt)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            opt.id === area.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{opt.name}</span>
                          {opt.id === area.id && (
                            <Icon name="check" size={16} className="text-emerald-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <h1 className="font-headline-md text-headline-md text-slate-900 dark:text-white font-bold truncate mt-0.5">
              {area.name}
            </h1>
            <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
              {area.location && (
                <p className="font-body-sm text-body-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Icon name="place" size={15} />
                  <span>{area.location}</span>
                </p>
              )}
              {videoMeta?.fileName && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800"
                  title={`Stored in browser IndexedDB: ${videoMeta.fileName}`}
                >
                  <Icon name="videocam" size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate max-w-[180px]">{videoMeta.fileName}</span>
                  <span className="text-emerald-600/75 dark:text-emerald-400/75">• Saved</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          {backendHealth && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                backendHealth.detection_engine === 'onnx'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
              title={`Vision Model: ${backendHealth.model || 'Unknown'} • Engine: ${backendHealth.detection_engine || 'none'}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.detection_engine === 'onnx' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="tracking-tight">
                {backendHealth.detection_engine === 'onnx'
                  ? 'YOLOv8 AI Active'
                  : 'AI Offline (Auth-Only)'}
              </span>
            </div>
          )}
          <StatusChip status={status} pulse={isPlaying} />
          {onEditArea && (
            <Button
              variant="secondary"
              onClick={() => onEditArea(area)}
              title="Edit facility metadata, rate & photo"
            >
              <svg className="w-4 h-4 fill-current text-slate-600 dark:text-slate-300" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span>Edit Details</span>
            </Button>
          )}
          <Button variant="secondary" onClick={onUploadClick}>
            <Icon name={videoStream ? 'swap_horiz' : 'upload_file'} size={18} />
            {videoStream ? 'Change Video' : 'Select Video'}
          </Button>
          {videoStream && onClearVideo && (
            <Button
              variant="secondary"
              onClick={onClearVideo}
              className="hover:border-red-300 dark:hover:border-red-800 hover:text-red-700 dark:hover:text-red-400"
              title="Remove saved video footage from this facility"
            >
              <Icon name="delete_sweep" size={18} />
              <span>Remove Video</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg items-start">
        {/* ---- Left: stage ---- */}
        <div className="xl:col-span-2 flex flex-col gap-space-md">
          {(videoUploadStatus?.busy || videoUploadStatus?.error || videoUploadStatus?.message) && (
            <div
              data-testid="video-upload-status"
              className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                videoUploadStatus.error
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <Icon name={videoUploadStatus.error ? 'warning' : videoUploadStatus.busy ? 'cloud_upload' : 'cloud_done'} size={16} />
              <span>{videoUploadStatus.error || videoUploadStatus.message}</span>
            </div>
          )}
          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-hidden transition-colors">
            {/* Tricolor bar */}
            <div className="h-1.5 w-full flex">
              <div className="w-1/3 bg-emerald-700" />
              <div className="w-1/3 bg-amber-500" />
              <div className="w-1/3 bg-red-600" />
            </div>

            {!videoStream ? (
              <div className="p-space-xl flex flex-col items-center text-center gap-space-sm">
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Icon name="videocam" size={34} />
                </div>
                <h2 className="font-headline-sm text-headline-sm text-slate-900 dark:text-white font-bold">
                  Upload footage for {area.name}
                </h2>
                <p className="font-body-md text-body-md text-slate-500 dark:text-slate-400 max-w-md">
                  Saved bay markings for {area.name} are restored and rescaled automatically once the clip loads.
                  Upload a local file or link a shared MP4/WebM URL so all operators see it in Live Monitor.
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-center mt-space-xs">
                  <Button onClick={onUploadClick}>
                    <Icon name="upload_file" size={18} />
                    Select Video File
                  </Button>
                </div>
                {onSaveVideoUrl && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (sharedUrlInput.trim()) onSaveVideoUrl(sharedUrlInput.trim())
                    }}
                    className="w-full max-w-md flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"
                  >
                    <input
                      type="text"
                      value={sharedUrlInput}
                      onChange={(e) => setSharedUrlInput(e.target.value)}
                      placeholder="Paste shared MP4 URL (e.g. https://.../lot.mp4 or /videos/lot.mp4)"
                      data-testid="shared-video-url-input"
                      className="flex-1 h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600"
                    />
                    <Button type="submit" variant="secondary" data-testid="save-shared-video-btn">
                      <Icon name="link" size={16} />
                      <span>Use Shared URL</span>
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="relative bg-slate-950">
                  <canvas
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    onMouseDown={onMouseDown}
                    className={`w-full h-auto block ${markingMode ? 'cursor-crosshair' : ''}`}
                  />

                  {markingMode && (
                    <div className="absolute top-space-md left-space-md right-space-md flex items-start justify-between gap-space-sm pointer-events-none">
                      <div className="bg-slate-900/90 text-white backdrop-blur border border-slate-700 rounded-lg px-space-md py-space-sm flex items-center gap-space-xs font-label-md text-label-md shadow-md max-w-md">
                        <Icon name="draw" size={18} />
                        <span>Drag anywhere on frame to mark a bay. Press Esc to cancel.</span>
                      </div>
                      <button
                        onClick={onToggleMarking}
                        className="pointer-events-auto bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg px-space-md py-space-sm font-label-md text-label-md flex items-center gap-space-xs shadow-md cursor-pointer transition-colors"
                      >
                        <Icon name="stop" size={16} />
                        Done Marking
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-space-md left-space-md flex items-center gap-space-xs">
                    <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-emerald-600/90 text-white font-label-caps text-label-caps font-bold shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Available {freeCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-red-600/90 text-white font-label-caps text-label-caps font-bold shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Occupied {occupiedCount}
                    </span>
                  </div>
                </div>

                <div className="p-space-md flex flex-col gap-space-md border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                    {/* Jump to start */}
                    <button
                      type="button"
                      data-testid="jump-start-btn"
                      onClick={() => onSeek && onSeek(0)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Jump to Start (00:00)"
                    >
                      <Icon name="skip_previous" size={18} />
                    </button>

                    {/* Step -5s */}
                    <button
                      type="button"
                      data-testid="step-back-btn"
                      onClick={() => onSeek && onSeek(Math.max(0, currentTime - 5))}
                      className="px-2 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold transition-colors cursor-pointer shrink-0 font-mono"
                      title="Step back 5 seconds"
                    >
                      -5s
                    </button>

                    {/* Play/Pause Button */}
                    <button
                      onClick={onPlayPause}
                      className="w-11 h-11 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={24} fill />
                    </button>

                    {/* Step +5s */}
                    <button
                      type="button"
                      data-testid="step-forward-btn"
                      onClick={() => onSeek && onSeek(Math.min(videoDuration || 0, currentTime + 5))}
                      className="px-2 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold transition-colors cursor-pointer shrink-0 font-mono"
                      title="Step forward 5 seconds"
                    >
                      +5s
                    </button>

                    {/* Drag & Click Scrubber */}
                    <div
                      data-testid="video-scrubber"
                      className="grow min-w-[120px] bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden cursor-pointer relative hover:opacity-90 transition-opacity select-none"
                      onMouseDown={handleScrubberMouseDown}
                      title="Click or drag timeline to seek footage"
                    >
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all pointer-events-none"
                        style={{ width: `${videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Timestamp Readout */}
                    <span className="font-label-md text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums shrink-0 font-mono">
                      {formatTime(currentTime)} / {formatTime(videoDuration)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-space-sm">
                    <Button
                      variant={markingMode ? 'danger' : 'secondary'}
                      onClick={onToggleMarking}
                    >
                      <Icon name={markingMode ? 'stop' : 'crop_square'} size={18} />
                      {markingMode ? 'Stop Marking' : 'Mark Spots'}
                    </Button>

                    {onScanFrame && totalCount > 0 && (
                      <Button
                        variant="secondary"
                        data-testid="scan-frame-btn"
                        onClick={onScanFrame}
                        title="Analyze parking bays in the currently displayed timestamp frame"
                      >
                        <Icon name="document_scanner" size={18} />
                        Scan Current Frame
                      </Button>
                    )}

                    {totalCount > 0 && (
                      <Button variant="ghost" onClick={onClearSpots}>
                        <Icon name="delete_sweep" size={18} />
                        Clear All ({totalCount})
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {totalCount > 0 ? (
            <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-hidden transition-colors">
              <div className="px-space-lg py-space-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-headline-sm text-headline-sm text-slate-900 dark:text-white font-bold">
                  Bay Register • {area.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-label-caps text-label-caps text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-space-sm py-1 rounded-full font-semibold">
                    {occupiedCount} OCCUPIED / {totalCount} TOTAL
                  </span>
                  {onClearSpots && (
                    <button
                      type="button"
                      onClick={onClearSpots}
                      className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear all marked bays for this area"
                    >
                      <Icon name="delete_sweep" size={14} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-space-md grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-space-sm">
                {spots.map((spot, index) => {
                  const isOccupied = occupiedSpots.has(index)
                  return (
                    <div
                      key={spot.id || index}
                      className={`flex items-center justify-between gap-space-xs rounded-lg border px-space-sm py-space-xs transition-colors ${
                        isOccupied
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-space-xs min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-label-md text-label-md font-bold text-white shrink-0 ${
                            isOccupied ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span
                          className={`font-label-md text-label-md uppercase font-semibold truncate ${
                            isOccupied
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {isOccupied ? 'Occupied' : 'Free'}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteSpot(index)}
                        title="Remove bay"
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0 cursor-pointer p-1"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 text-center flex flex-col items-center gap-2 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Icon name="crop_square" size={22} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Parking Bays Configured</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Upload video footage to mark and calibrate bay boundaries across this facility.
              </p>
            </div>
          )}
        </div>

        {/* ---- Right: telemetry rail ---- */}
        <div className="flex flex-col gap-space-md xl:sticky xl:top-20">
          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex flex-col gap-space-md transition-colors">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-slate-900 dark:text-white font-bold">
                Current Status
              </h3>
              <span className="font-label-caps text-label-caps text-slate-500 dark:text-slate-400 uppercase font-semibold">
                {totalCount} bays
              </span>
            </div>

            <div className="flex items-end justify-between gap-space-sm">
              <div>
                <span className="font-stat-display text-stat-display text-emerald-700 dark:text-emerald-400 font-extrabold leading-none">
                  {freeCount}
                </span>
                <p className="font-label-caps text-label-caps text-slate-500 dark:text-slate-400 uppercase font-semibold mt-1">
                  Free Now
                </p>
              </div>
              <div className="text-right">
                <span className="font-headline-md text-headline-md text-red-600 dark:text-red-400 font-bold">
                  {occupiedCount}
                </span>
                <p className="font-label-caps text-label-caps text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  Occupied
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <Gauge percent={occupiedPct} status={status} />
              <div className="flex justify-between font-label-caps text-label-caps text-slate-500 dark:text-slate-400">
                <span>{current.occupancyRate || 0}% Occupied</span>
                <span>{current.available ?? freeCount} available</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-space-lg flex flex-col gap-space-md transition-colors">
            <div className="flex items-center gap-space-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <h3 className="font-headline-sm text-headline-sm text-slate-900 dark:text-white font-bold">
                Optical Sensing Engine
              </h3>
            </div>

            <div className="font-body-sm text-body-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isPlaying ? (
                <>
                  Sampling one frame every {(detectIntervalMs / 1000).toFixed(1)}s for {area.name} using automated optical vision sensors. Readings update continuously to calibrate bay occupancy.
                </>
              ) : (
                `Press play to begin analysing frames against the marked bays for ${area.name}.`
              )}
            </div>

            <label className="flex flex-col gap-space-xs">
              <span className="font-label-md text-label-md text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold flex justify-between">
                <span>Check interval</span>
                <span className="text-slate-900 dark:text-white">{(detectIntervalMs / 1000).toFixed(1)}s</span>
              </span>
              <input
                type="range"
                min="500"
                max="5000"
                step="500"
                value={detectIntervalMs}
                onChange={(e) => onIntervalChange(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="flex justify-between font-label-caps text-label-caps text-slate-400 uppercase">
                <span>0.5s · fastest</span>
                <span>5.0s · lightest</span>
              </span>
            </label>
          </div>

          {history.length > 0 && (
            <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-hidden transition-colors">
              <div className="px-space-lg py-space-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-slate-900 dark:text-white font-bold">
                  Reading History
                </h3>
                <span className="font-label-caps text-label-caps text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  last {Math.min(history.length, 12)}
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {history
                  .slice(-12)
                  .reverse()
                  .map((entry, idx) => (
                    <div
                      key={`${entry.timestamp || entry.timeSeconds}-${idx}`}
                      className="px-space-lg py-space-sm flex items-center justify-between gap-space-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="font-label-md text-label-md text-slate-500 dark:text-slate-400 tabular-nums">
                        {entry.time}
                      </span>
                      <div className="flex items-center gap-space-xs font-body-sm text-body-sm">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{entry.available} free</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-red-600 dark:text-red-400 font-semibold">{entry.occupied} occ</span>
                      </div>
                      <span className="font-label-md text-label-md text-slate-900 dark:text-white font-bold tabular-nums w-12 text-right">
                        {entry.occupancyRate}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
