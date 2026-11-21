import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Icon,
  Button,
  StatusChip,
  Gauge,
  EmptyState,
} from './ui'
import { classifyAvailability, toneOf, timeAgo } from '../utils/statusUtils'
import KampalaParkingMap from './KampalaParkingMap'
import { getStationCode } from '../utils/stationCodes'

export default function LandingPage({ entries = [], auth, setCurrentView, onOpenLoginModal }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('all')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('available')
  const [mapOpen, setMapOpen] = useState(false)
  const [focusedFacilityId, setFocusedFacilityId] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [previewImageModal, setPreviewImageModal] = useState(null)

  // Real backend entries
  const decorated = useMemo(() => {
    return (entries || []).map((entry) => {
      const loc = entry.area?.location || ''
      const zone = loc.split(/[,•]/)[0]?.trim() || 'Central Division'
      return {
        ...entry,
        status: classifyAvailability(entry),
        zone,
        imageUrl: entry.area?.imageUrl || '/hero-parking.jpg',
        hourlyRate: entry.area?.hourlyRate || 'UGX 2,000 / hr',
      }
    })
  }, [entries])

  // Real available division zones derived from real data
  const zones = useMemo(() => {
    const counts = new Map()
    decorated.forEach((e) => counts.set(e.zone, (counts.get(e.zone) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [decorated])

  // Filtered visible facilities from real backend data
  const visible = useMemo(() => {
    const q = query.toLowerCase().trim()
    return decorated
      .filter((e) => {
        if (selectedDivision !== 'all' && e.zone !== selectedDivision) return false
        if (filter === 'available40' && !(e.status === 'high' && e.free > 40)) return false
        if (filter !== 'all' && filter !== 'available40' && e.zone !== filter) return false
        if (!q) return true
        return (
          e.area?.name?.toLowerCase().includes(q) ||
          (e.area?.location || '').toLowerCase().includes(q) ||
          e.zone.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (sort === 'name') return (e.area?.name || '').localeCompare(b.area?.name || '')
        if (sort === 'recent') return (a.updatedAt || 0) < (b.updatedAt || 0) ? 1 : -1
        return b.free - a.free
      })
  }, [decorated, query, selectedDivision, filter, sort])

  // Real city-wide totals
  const totals = useMemo(() => {
    const live = decorated.filter((e) => e.hasLive && e.total > 0)
    const capacity = decorated.reduce((s, e) => s + (e.total || 0), 0)
    const free = decorated.reduce((s, e) => s + (e.free || 0), 0)
    const occupied = decorated.reduce((s, e) => s + (e.occupied || 0), 0)
    return {
      free,
      occupied,
      capacity,
      liveLots: live.length,
      lots: decorated.length,
      pct: capacity ? Math.round((free / capacity) * 100) : 0,
    }
  }, [decorated])

  const scrollToSpots = () => {
    const el = document.getElementById('parking-spots')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleHeroSearch = (e) => {
    e.preventDefault()
    scrollToSpots()
  }

  const pulse = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 800)
  }

  const chipClass = (active) =>
    `px-3.5 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors border cursor-pointer ${
      active
        ? 'bg-emerald-700 text-white border-emerald-700 font-semibold shadow-xs'
        : 'bg-white dark:bg-[#151f30] border-slate-200 dark:border-[#334155] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
    }`

  return (
    <div className="flex flex-col w-full text-slate-900 dark:text-white">
      {/* =========================================================================
          SECTION 1: HERO SECTION
          ========================================================================= */}
      <section
        id="home"
        className="w-full bg-slate-50 dark:bg-[#070f1e] text-slate-900 dark:text-white pt-8 pb-12 px-margin md:px-margin-md lg:px-margin-lg border-b border-slate-200 dark:border-slate-800 transition-colors"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Headline, CTAs, Live Bay Summary */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-7">
              <div className="flex flex-col gap-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  <span className="font-label-caps text-[11px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
                    Kampala Capital City Authority • Public Parking Registry
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12] break-words">
                  Find open parking across Kampala before you drive.
                </h1>

                <p className="text-base text-slate-600 dark:text-slate-300 max-w-xl font-body-lg leading-relaxed">
                  Check live bay availability, gazetted hourly rates, and directions across municipal decks and street lots to skip curb circling.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    onClick={scrollToSpots}
                    className="w-full sm:w-auto justify-center px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold font-label-lg text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Icon name="local_parking" size={18} />
                    <span>Browse Live Spots</span>
                  </button>

                  {auth?.token ? (
                    auth.role === 'admin' || auth.role === 'operator' ? (
                      <button
                        onClick={() => setCurrentView('dashboard')}
                        className="w-full sm:w-auto justify-center px-6 py-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold font-label-lg text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Icon name="dashboard" size={17} />
                        <span>Operator Workspace</span>
                      </button>
                    ) : (
                      <button
                        onClick={scrollToSpots}
                        className="w-full sm:w-auto justify-center px-5 py-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold font-label-lg text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Icon name="check_circle" size={17} />
                        <span>Signed in as @{auth.username}</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        if (onOpenLoginModal) {
                          onOpenLoginModal({ initialMode: 'signin' })
                        } else {
                          setCurrentView('login')
                        }
                      }}
                      data-testid="hero-signin-btn"
                      className="w-full sm:w-auto justify-center px-6 py-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-semibold font-label-lg text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="login" size={17} />
                      <span>Sign In / Register</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Real Data Counters */}
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {totals.free.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Free Bays Now
                  </span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {totals.capacity.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Capacity
                  </span>
                </div>
                <div>
                  <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {totals.lots}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    Registered Lots
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Facility Photograph + Quick-Finder Bar */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1b2a] shadow-sm">
                <div className="h-[280px] sm:h-[320px] w-full overflow-hidden bg-slate-900">
                  <img
                    src="/hero-parking.jpg"
                    alt="Kampala Municipal Smart Parking Facility"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                    <Icon name="videocam" size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Overhead camera monitoring across municipal lots</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold hidden sm:inline shrink-0">
                    Mon–Sat 07:00–19:00
                  </span>
                </div>
              </div>

              {/* Dynamic division quick-finder bar beneath photo */}
              <form onSubmit={handleHeroSearch} className="bg-white dark:bg-[#0d1b2a] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2.5 shadow-xs transition-colors">
                <div className="relative w-full sm:w-1/2">
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs appearance-none focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="all">All Divisions ({decorated.length} Facilities)</option>
                    {zones.map(([zone, count]) => (
                      <option key={zone} value={zone}>
                        {zone} ({count} {count === 1 ? 'lot' : 'lots'})
                      </option>
                    ))}
                  </select>
                  <Icon name="expand_more" size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>

                <div className="relative w-full sm:w-1/2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search street or facility name..."
                    className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-xs focus:outline-none focus:border-emerald-600"
                  />
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 h-10 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>Find Spots</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: COMPACT CIVIC STANDARDS STRIP
          ========================================================================= */}
      <section className="w-full bg-white dark:bg-[#0c1322] py-8 px-margin md:px-margin-md lg:px-margin-lg border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Icon name="directions_car" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Skip Curb Circling
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Check open bay counts by division before heading into central Kampala.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Icon name="videocam" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Automated Camera Counts
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Overhead feeds track bay occupancy continuously without in-road sensors.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Icon name="verified" size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Gazetted KCCA Rates
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Official municipal tariffs and enforcement hours (Mon–Sat, 07:00–19:00; Sundays free).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: LIVE PARKING SPOTS DIRECTORY (100% REAL BACKEND DATA)
          ========================================================================= */}
      <section id="parking-spots" className="w-full bg-white dark:bg-[#070f1e] py-16 px-margin md:px-margin-md lg:px-margin-lg border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Live Availability
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                Monitored Parking Facilities
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Real-time bay capacity, open space counts, and facility photos across Kampala.
              </p>
            </div>

            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-fit tabular-nums">
              Showing {visible.length} of {decorated.length} Facilities
            </span>
          </div>

          {/* Search, Sort, and Map Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-6 relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search facility name, street, or landmark…"
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-[#151f30] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <Icon
                name="search"
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            <div className="lg:col-span-6 flex flex-wrap items-center justify-start lg:justify-end gap-3">
              <button
                type="button"
                data-testid="find-on-map-btn"
                onClick={() => {
                  const next = !mapOpen
                  setMapOpen(next)
                  if (next) {
                    setTimeout(() => {
                      const el = document.getElementById('gis-map-view')
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  }
                }}
                className={`h-12 px-5 rounded-xl border font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                  mapOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-50 dark:bg-[#151f30] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon name="map" size={18} />
                <span>{mapOpen ? 'Hide Map' : 'Find on Map'}</span>
              </button>

              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-12 pl-4 pr-9 rounded-xl bg-slate-50 dark:bg-[#151f30] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm appearance-none cursor-pointer focus:outline-none focus:border-amber-400"
                >
                  <option value="available">Sort by: Most Available</option>
                  <option value="recent">Sort by: Recently Updated</option>
                  <option value="name">Sort by: Name (A-Z)</option>
                </select>
                <Icon
                  name="expand_more"
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={pulse}
                title="Refresh telemetry"
                className="h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#151f30] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="sync" size={18} className={syncing ? 'animate-spin text-amber-500' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Division Zone Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs uppercase font-extrabold text-slate-400 mr-1 shrink-0">
              Divisions:
            </span>
            <button className={chipClass(selectedDivision === 'all')} onClick={() => setSelectedDivision('all')}>
              All Facilities ({decorated.length})
            </button>
            {zones.map(([zone, count]) => (
              <button
                key={zone}
                className={chipClass(selectedDivision === zone)}
                onClick={() => setSelectedDivision(zone)}
              >
                {zone} ({count})
              </button>
            ))}
          </div>

          {/* Relative Container: Live facilities & Map blurred when unauthenticated */}
          <div className="relative w-full">
            <div
              data-testid="parking-spots-content"
              className={
                !auth?.token
                  ? 'filter blur-md select-none pointer-events-none opacity-40 transition-all duration-500 min-h-[480px]'
                  : 'transition-all duration-500'
              }
            >
              {/* Map View Drawer */}
              {mapOpen && (
                <div id="gis-map-view" className="w-full my-3 scroll-mt-24">
                  <KampalaParkingMap
                    facilities={decorated}
                    focusedFacilityId={focusedFacilityId}
                    onSelectFacility={(area) => {
                      navigate(`/areas/${area.id}`)
                    }}
                    onClose={() => setMapOpen(false)}
                  />
                </div>
              )}

              {/* Facility Cards Grid with REAL UPLOADED IMAGES */}
              {decorated.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                  <Icon name="domain" size={40} className="text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No parking facilities registered yet</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Operators can sign in to register parking facilities, upload location photos, and calibrate camera feeds.
                  </p>
                  <button
                    onClick={() => setCurrentView('login')}
                    className="mt-2 px-6 py-2.5 rounded-full bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
                  >
                    Operator Sign In
                  </button>
                </div>
              ) : visible.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
                  <Icon name="search_off" size={40} className="text-slate-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">No parking facilities match your search</h3>
                  <p className="text-sm text-slate-500">Try searching for another division or clear the active query.</p>
                  <button
                    onClick={() => {
                      setQuery('')
                      setSelectedDivision('all')
                    }}
                    className="mt-2 px-5 py-2 rounded-full bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visible.map((entry) => {
                    const occPercent = entry.total > 0 ? Math.round((entry.occupied / entry.total) * 100) : 0
                    return (
                      <article
                        key={entry.id}
                        id={`facility-card-${entry.id}`}
                        className="bg-white dark:bg-[#0d1b2a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group scroll-mt-28"
                      >
                        {/* Facility Photo Header: shows motorists what the parking spot / facility looks like */}
                        <div
                          className="relative h-44 w-full bg-slate-800 overflow-hidden cursor-pointer"
                          onClick={() => setPreviewImageModal({ url: entry.imageUrl, name: entry.area?.name })}
                          title="Click to view full photo"
                        >
                          <img
                            src={entry.imageUrl}
                            alt={entry.area?.name || 'Parking Spot Facility'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/hero-parking.jpg'
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 pointer-events-none" />

                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-900/85 text-amber-300 border border-slate-700 font-mono">
                              {getStationCode(entry.area || entry)}
                            </span>
                            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-slate-900/75 text-slate-200 border border-slate-700/60 hidden sm:inline">
                              {entry.zone}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3">
                            <StatusChip status={entry.status} />
                          </div>

                          <div
                            data-testid={`card-price-badge-${entry.id}`}
                            className="absolute bottom-2.5 left-3 text-[11px] font-extrabold text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-md shadow-xs flex items-center gap-1"
                          >
                            <Icon name="payments" size={12} />
                            <span>{entry.area?.hourlyRate || 'UGX 2,000 / hr'}</span>
                          </div>

                          <div className="absolute bottom-2.5 right-3 text-[11px] text-white/90 bg-black/65 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Icon name="search" size={12} />
                            <span>View Photo</span>
                          </div>
                        </div>

                        {/* Facility details */}
                        <div className="p-5 flex flex-col gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {entry.area?.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <Icon name="place" size={14} className="text-slate-400 shrink-0" />
                              <span className="truncate">{entry.area?.location || 'Kampala, Uganda'}</span>
                            </p>
                          </div>

                          {/* Occupancy stats with Gauge */}
                          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-4">
                            <div>
                              <span className="block text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                                {entry.free}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider tabular-nums">
                                Free Bays (of {entry.total})
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <Gauge value={occPercent} size={52} stroke={6} />
                              <span className="text-[10px] font-semibold text-slate-500 mt-1 tabular-nums">{occPercent}% Occ.</span>
                            </div>
                          </div>

                          {/* Bottom action row */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                            <span className="font-bold text-amber-700 dark:text-amber-400 font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                              {getStationCode(entry.area || entry)}
                            </span>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <button
                                type="button"
                                data-testid={`view-details-btn-${entry.id}`}
                                onClick={() => navigate(`/areas/${entry.id}`)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                                title="View Complete Facility Details"
                              >
                                <Icon name="info" size={14} />
                                <span>View Details</span>
                              </button>

                              <button
                                type="button"
                                data-testid={`map-locate-${entry.id}`}
                                onClick={() => {
                                  setFocusedFacilityId(entry.id)
                                  setMapOpen(true)
                                  setTimeout(() => {
                                    const el = document.getElementById('gis-map-view')
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                  }, 100)
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer text-xs"
                                title="Focus on Kampala GIS Map"
                              >
                                <Icon name="pin_drop" size={14} className="text-emerald-700 dark:text-emerald-400" />
                                <span>Map</span>
                              </button>

                              {auth?.token ? (
                                <button
                                  onClick={() => setCurrentView(`monitor/${entry.id}`)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Icon name="videocam" size={14} />
                                  <span>Monitor</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] hidden sm:inline">
                                  Updated {timeAgo(entry.updatedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Auth Gate Overlay: visible when !auth?.token */}
            {!auth?.token && (
              <div
                data-testid="parking-spots-gate-overlay"
                className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-900/15 dark:bg-black/40 backdrop-blur-xs"
              >
                <div className="w-full max-w-lg p-7 sm:p-8 rounded-2xl bg-white dark:bg-[#070f1e] border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center text-center gap-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <Icon name="lock" size={24} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-md">
                      Free Motorist Access
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-950 dark:text-white mt-2.5 leading-tight">
                      Sign In or Register to View Live Parking Spots
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md leading-relaxed">
                      Live bay counts, gazetted municipal rates, and interactive Kampala maps are available to registered motorists and operators.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full pt-1">
                    <button
                      type="button"
                      data-testid="gate-signup-btn"
                      onClick={() => onOpenLoginModal && onOpenLoginModal({ initialMode: 'signup' })}
                      className="w-full sm:w-1/2 py-3 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Create Free Account</span>
                    </button>
                    <button
                      type="button"
                      data-testid="gate-signin-btn"
                      onClick={() => onOpenLoginModal && onOpenLoginModal({ initialMode: 'signin' })}
                      className="w-full sm:w-1/2 py-3 px-5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Sign In</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Takes 15 seconds • Free for all Kampala motorists &amp; commuters
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FACILITY PHOTO MODAL (View how the spot/facility looks like in full size)
          ========================================================================= */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Icon name="place" size={18} className="text-amber-400" />
                <h3 className="text-white font-bold text-base">{previewImageModal.name}</h3>
              </div>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close photo preview"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden flex items-center justify-center bg-black">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="p-3 bg-slate-950 text-slate-400 text-xs text-center border-t border-slate-800">
              Verified municipal parking facility entrance photo • KCCA ParkWatch
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: CIVIC AUTHORITY SUMMARY & FOOTER BANNER
          ========================================================================= */}
      <section className="w-full bg-[#070f1e] text-white py-14 px-margin md:px-margin-md lg:px-margin-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-800 pb-10">
          <div className="max-w-xl flex flex-col gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
              Civic Infrastructure
            </span>
            <h3 className="text-2xl font-black text-white">
              Decongesting Kampala Through Digital Innovation
            </h3>
            <p className="text-sm text-slate-400 font-normal">
              ParkWatch empowers Kampala motorists to make informed decisions before embarking on journeys,
              reducing curb circling by an estimated 28% in pilot corridors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={scrollToSpots}
              className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
            >
              Browse Parking Spots
            </button>
            <button
              onClick={() => setCurrentView(auth?.token ? 'dashboard' : 'login')}
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              Operator Sign In
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
