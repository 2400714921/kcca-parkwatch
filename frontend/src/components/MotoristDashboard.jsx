import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon, Button, StatusChip, Gauge, classifyAvailability } from './ui'
import { getStationCode } from '../utils/stationCodes'

export default function MotoristDashboard({
  areas = [],
  availability = {},
  auth = {},
  onOpenProfileModal,
}) {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('kcca_motorist_favorites')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('all')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [focusedAreaId, setFocusedAreaId] = useState(null)
  const [viewMode, setViewMode] = useState('grid')

  const mapContainerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef = useRef({})

  const toggleFavorite = (areaId) => {
    setFavorites((prev) => {
      const next = prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
      try {
        localStorage.setItem('kcca_motorist_favorites', JSON.stringify(next))
      } catch (err) {
        console.warn('Failed to save favorites to localStorage:', err)
      }
      return next
    })
  }

  // Calculate city-wide metrics
  const stats = useMemo(() => {
    let totalBays = 0
    let freeBays = 0
    let occupiedBays = 0
    let bestArea = null
    let highestFree = -1

    areas.forEach((area) => {
      const entry = availability[area.id] || {
        total: area.capacity || 50,
        free: area.capacity || 50,
        occupied: 0,
      }
      const cap = Number(entry.total) || Number(area.capacity) || 50
      const free = Number(entry.free) ?? cap
      totalBays += cap
      freeBays += free
      occupiedBays += Number(entry.occupied) || Math.max(0, cap - free)

      if (free > highestFree) {
        highestFree = free
        bestArea = { area, free, cap }
      }
    })

    return {
      totalBays,
      freeBays,
      occupiedBays,
      facilityCount: areas.length,
      bestArea,
    }
  }, [areas, availability])

  // Filter facilities
  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const matchesSearch =
        searchQuery === '' ||
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (area.location && area.location.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesDivision =
        selectedDivision === 'all' ||
        (area.location && area.location.toLowerCase().includes(selectedDivision.toLowerCase()))

      const matchesFavorites = !showOnlyFavorites || favorites.includes(area.id)

      return matchesSearch && matchesDivision && matchesFavorites
    })
  }, [areas, searchQuery, selectedDivision, showOnlyFavorites, favorites])

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!leafletMapRef.current) {
      // Kampala center coordinates
      const map = L.map(mapContainerRef.current, {
        center: [0.31628, 32.58219],
        zoom: 14,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | KCCA GIS Telemetry',
        maxZoom: 19,
      }).addTo(map)

      leafletMapRef.current = map
    }

    const map = leafletMapRef.current

    // Clear existing markers safely
    Object.values(markersRef.current).forEach((item) => {
      if (item?.marker?.remove) item.marker.remove()
      else if (item?.remove) item.remove()
    })
    markersRef.current = {}

    // Add marker for each area
    areas.forEach((area) => {
      let lat = 0.31628
      let lng = 32.58219

      if (area.coordinates) {
        lat = Number(area.coordinates.lat) || lat
        lng = Number(area.coordinates.lng) || lng
      } else if (area.lat && area.lng) {
        lat = Number(area.lat)
        lng = Number(area.lng)
      } else {
        // Fallback offset around Kampala center
        const seed = String(area.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
        lat = 0.313 + ((seed % 10) - 5) * 0.003
        lng = 32.581 + (((seed * 7) % 10) - 5) * 0.003
      }

      const entry = availability[area.id] || {
        total: area.capacity || 50,
        free: area.capacity || 50,
        occupied: 0,
      }
      const cap = Number(entry.total) || Number(area.capacity) || 50
      const free = Number(entry.free) ?? cap
      const status = classifyAvailability(entry)

      const color =
        status.tone === 'positive' ? '#10b981' : status.tone === 'warning' ? '#f59e0b' : '#ef4444'

      const customIcon = L.divIcon({
        className: 'kcca-motorist-pin',
        html: `
          <div style="
            background: ${color};
            color: #ffffff;
            font-size: 11px;
            font-weight: 900;
            padding: 4px 8px;
            border-radius: 9999px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="font-weight:800;font-size:12px;">P</span>
            <span>${free} Free</span>
          </div>
        `,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)

      const popupContent = `
        <div style="font-family: inherit; min-width: 190px; color: #0f172a; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800;">${area.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${area.location || 'Kampala Division'}</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 6px 8px; font-size: 11px; margin-bottom: 8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
              <span>Available Bays:</span>
              <strong style="color: ${color}; font-weight: 800;">${free} / ${cap}</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Station Code:</span>
              <strong style="color: #d97706; font-family: monospace;">${getStationCode(area)}</strong>
            </div>
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}"
            target="_blank"
            rel="noopener noreferrer"
            style="display: block; text-align: center; background: #059669; color: #ffffff; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;"
          >
            🧭 Navigate in Google Maps
          </a>
        </div>
      `
      marker.bindPopup(popupContent)
      markersRef.current[area.id] = { marker, lat, lng }
    })
  }, [areas, availability])

  const focusAreaOnMap = (areaId) => {
    setFocusedAreaId(areaId)
    const target = markersRef.current[areaId]
    if (target && leafletMapRef.current) {
      leafletMapRef.current.setView([target.lat, target.lng], 16, { animate: true })
      target.marker.openPopup()
      const mapEl = document.getElementById('motorist-gis-map')
      if (mapEl) {
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const divisions = ['all', 'Central', 'Nakawa', 'Kawempe', 'Makindye', 'Rubaga']

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Compact Motorist Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Motorist Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Welcome back, {auth.displayName || auth.username}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Check live bay availability across Kampala arcades, save favorite lots, and open turn-by-turn directions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onOpenProfileModal && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenProfileModal}
              className="rounded-lg text-xs font-semibold"
            >
              <Icon name="person" size={16} />
              <span>My Profile</span>
            </Button>
          )}
          <a
            href="#motorist-gis-map"
            className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="map" size={16} />
            <span>City Map</span>
          </a>
        </div>
      </div>

      {/* 4 Key Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Available Bays */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Available Bays</span>
            <Icon name="local_parking" size={18} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats.freeBays.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
            Across {stats.facilityCount} Kampala arcades
          </span>
        </div>

        {/* Total Capacity */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total City Bays</span>
            <Icon name="domain" size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats.totalBays.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Occupancy: {Math.round((stats.occupiedBays / (stats.totalBays || 1)) * 100)}%
          </span>
        </div>

        {/* Enforcement Hours */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Enforcement Hours</span>
            <Icon name="schedule" size={18} className="text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate tabular-nums">
            07:00 – 19:00
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
            Mon – Sat • Sundays Free
          </span>
        </div>

        {/* Highest Availability Spot */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Best Availability</span>
            <Icon name="verified" size={18} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {stats.bestArea?.area?.name || 'Central Arcade'}
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
            {stats.bestArea?.free || 0} Free Bays Right Now
          </span>
        </div>
      </div>

      {/* Facility Directory & Real-Time Availability */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Icon name="local_parking" size={20} className="text-emerald-700 dark:text-emerald-400" />
              <span>City Parking Facilities</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tabular-nums">
                {filteredAreas.length} of {areas.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live bay availability, hourly fees, and map directions
            </p>
          </div>

          {/* Quick Filters & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowOnlyFavorites((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                showOnlyFavorites
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon name={showOnlyFavorites ? 'star' : 'star_border'} size={15} />
              <span>Favorites Only ({favorites.length})</span>
            </button>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                data-testid="motorist-view-grid"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="grid_view" size={14} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                data-testid="motorist-view-table"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="table_rows" size={14} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search & Division Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facility name, road or street (e.g. City Square, Nakasero)..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:border-amber-400 focus:outline-none shadow-xs"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Icon name="search" size={18} />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Division Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedDivision === div
                    ? 'bg-emerald-600 text-white border-emerald-600 font-black shadow-xs'
                    : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {div === 'all' ? 'All Divisions' : `${div} Division`}
              </button>
            ))}
          </div>
        </div>

        {/* Facilities Grid */}
        {filteredAreas.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white dark:bg-[#111827] border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center gap-2">
            <Icon name="search_off" size={32} className="text-slate-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No parking facilities found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Try adjusting your search criteria or clearing the favorites filter to explore all
              monitored Kampala arcades.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSelectedDivision('all')
                setShowOnlyFavorites(false)
              }}
              className="mt-2 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Facility</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Availability</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAreas.map((area) => {
                  const entry = availability[area.id] || {
                    total: area.capacity || 50,
                    free: area.capacity || 50,
                    occupied: 0,
                  }
                  const cap = Number(entry.total) || Number(area.capacity) || 50
                  const free = Number(entry.free) ?? cap
                  const status = classifyAvailability(entry)
                  const isFav = favorites.includes(area.id)

                  return (
                    <tr key={area.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFavorite(area.id)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isFav ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                          >
                            <Icon name={isFav ? 'star' : 'star_border'} size={16} />
                          </button>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 dark:text-white">{area.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{getStationCode(area)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                        {area.location || 'Central Division, Kampala'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusChip status={status} />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <span className="font-bold text-slate-900 dark:text-white">{free} Free</span>
                        <span className="text-slate-400"> / {cap} Bays</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/dashboard/pay/${area.id}`)}
                            className="py-1.5 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs cursor-pointer"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => navigate(`/areas/${area.id}`)}
                            className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => focusAreaOnMap(area.id)}
                            className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer"
                          >
                            Map
                          </button>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              area.name + ' ' + (area.location || 'Kampala')
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs cursor-pointer"
                          >
                            Directions
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAreas.map((area) => {
              const entry = availability[area.id] || {
                total: area.capacity || 50,
                free: area.capacity || 50,
                occupied: 0,
              }
              const cap = Number(entry.total) || Number(area.capacity) || 50
              const free = Number(entry.free) ?? cap
              const occ = Number(entry.occupied) || Math.max(0, cap - free)
              const status = classifyAvailability(entry)
              const isFav = favorites.includes(area.id)
              const isFocused = focusedAreaId === area.id

              return (
                <div
                  key={area.id}
                  className={`rounded-2xl bg-white dark:bg-[#111827] border p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
                    isFocused
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    {/* Top Row: Name, Favorite, & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-amber-500 border border-slate-200 dark:border-slate-700">
                            {getStationCode(area)}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                          {area.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <Icon name="location_on" size={13} className="shrink-0 text-slate-400" />
                          <span>{area.location || 'Central Division, Kampala'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleFavorite(area.id)}
                          data-testid={`star-favorite-${area.id}`}
                          title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFav
                              ? 'text-amber-400 hover:text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          <Icon name={isFav ? 'star' : 'star_border'} size={18} />
                        </button>
                        <StatusChip status={status} />
                      </div>
                    </div>

                    {/* Occupancy Progress Gauge Bar */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Live Availability
                        </span>
                        <div className="text-xs font-black">
                          <span
                            className={
                              status.tone === 'positive'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : status.tone === 'warning'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {free} Free
                          </span>
                          <span className="text-slate-400"> / {cap} Bays</span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            status.tone === 'positive'
                              ? 'bg-emerald-500'
                              : status.tone === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((occ / (cap || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold border border-amber-200 dark:border-amber-800/60">
                        {getStationCode(area)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                        24/7 Security
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                        CCTV Monitored
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    <button
                      onClick={() => navigate(`/dashboard/pay/${area.id}`)}
                      data-testid={`motorist-pay-${area.id}`}
                      className="py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Icon name="credit_card" size={14} />
                      <span>Pay</span>
                    </button>
                    <button
                      onClick={() => navigate(`/areas/${area.id}`)}
                      data-testid={`motorist-view-details-${area.id}`}
                      className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="View Complete Facility Details"
                    >
                      <Icon name="info" size={14} />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => focusAreaOnMap(area.id)}
                      data-testid={`focus-map-${area.id}`}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Icon name="map" size={14} />
                      <span>Map</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        area.name + ' ' + (area.location || 'Kampala')
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Icon name="directions" size={14} />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Integrated Kampala GIS Map */}
      <div
        id="motorist-gis-map"
        className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Icon name="map" size={20} className="text-emerald-700 dark:text-emerald-400" />
              <span>Interactive City Map</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live geo-spatial pin coordinates across Kampala. Green = Available, Amber = Limited,
              Red = Full.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Limited
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Full
            </span>
          </div>
        </div>

        <div
          ref={mapContainerRef}
          className="w-full h-[400px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner z-0"
        />
      </div>

      {/* Official KCCA Municipal Parking & Enforcement Guide */}
      <div className="rounded-xl bg-white dark:bg-[#111827] p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Official KCCA Parking Guide
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Enforcement: Mon–Sat 07:00 – 19:00
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Municipal Parking Enforcement &amp; Operating Hours
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Automated bay monitoring operates across gazetted Kampala Capital City facilities. Sundays, gazetted public holidays, and overnight hours (19:00 – 07:00) offer complimentary open parking.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 bg-slate-50 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[230px]">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Operating Hours
          </span>
          <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Enforcement Days:</span>
            <span className="font-semibold text-slate-900 dark:text-white tabular-nums">Mon – Sat (07:00–19:00)</span>
          </div>
          <div className="flex justify-between text-xs py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Overnight Parking:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Complimentary Free</span>
          </div>
          <div className="flex justify-between text-xs py-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span>Sundays &amp; Holidays:</span>
            <span>FREE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
