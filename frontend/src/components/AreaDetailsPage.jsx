import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon, Gauge, StatusChip } from './ui'
import { getStationCode } from '../utils/stationCodes'
import { timeAgo } from '../utils/statusUtils'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

// Default division coordinates fallbacks around Kampala
const DIVISION_COORDS = {
  central: [0.3136, 32.5811],
  nakawa: [0.3276, 32.6074],
  kawempe: [0.3540, 32.5930],
  rubaga: [0.3020, 32.5530],
  makindye: [0.2920, 32.5860],
}

export default function AreaDetailsPage({ areas = [], availability = {}, auth = {}, onOpenLoginModal }) {
  const { areaId } = useParams()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [localArea, setLocalArea] = useState(null)
  const [loading, setLoading] = useState(true)

  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Find area from props or fetch from API
  useEffect(() => {
    const found = (areas || []).find((a) => String(a.id) === String(areaId))
    if (found) {
      setLocalArea(found)
      setLoading(false)
      return
    }

    // Fallback: Fetch directly from backend
    async function fetchArea() {
      try {
        const res = await fetch(`${API_URL}/areas`)
        if (res.ok) {
          const list = await res.json()
          const matched = list.find((a) => String(a.id) === String(areaId))
          if (matched) {
            setLocalArea(matched)
          }
        }
      } catch (e) {
        console.warn('Failed to fetch area details:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchArea()
  }, [areaId, areas])

  // Derive coordinates
  const coords = React.useMemo(() => {
    if (!localArea) return [0.3136, 32.5811]
    if (localArea.lat && localArea.lng) {
      return [Number(localArea.lat), Number(localArea.lng)]
    }
    const loc = (localArea.location || '').toLowerCase()
    for (const [div, c] of Object.entries(DIVISION_COORDS)) {
      if (loc.includes(div)) return c
    }
    return [0.3136, 32.5811]
  }, [localArea])

  // Mount Leaflet Mini-Map
  useEffect(() => {
    if (!mapContainerRef.current || !localArea) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: coords,
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap • KCCA GIS',
    }).addTo(map)

    // Custom KCCA Pin Icon
    const customIcon = L.divIcon({
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #0f172a;
          border: 3px solid #f59e0b;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        ">
          <span style="transform: rotate(45deg); font-size: 14px; font-weight: 800; color: #f59e0b; font-family: 'Plus Jakarta Sans', sans-serif;">P</span>
        </div>
      `,
      className: 'area-page-marker',
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -36],
    })

    const marker = L.marker(coords, { icon: customIcon }).addTo(map)
    marker.bindPopup(`<strong>${localArea.name}</strong><br/>${localArea.location || 'Kampala'}`).openPopup()

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [coords, localArea])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3">
        <Icon name="progress_activity" size={32} className="animate-spin text-amber-500" />
        <span className="text-sm font-bold text-slate-500">Loading facility telemetry...</span>
      </div>
    )
  }

  if (!localArea) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-2xl font-black">
          📍
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Facility Not Found</h1>
        <p className="text-sm text-slate-500 max-w-md">
          The requested municipal parking area does not exist or has been relocated.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          ← Return to Parking Overview
        </button>
      </div>
    )
  }

  const stationCode = getStationCode(localArea)
  const availItem = availability[localArea.id] || {}
  const analyticsSeries = Array.isArray(localArea.analytics) ? localArea.analytics.slice(-24) : []
  const latestSnapshot = analyticsSeries.length > 0 ? analyticsSeries[analyticsSeries.length - 1] : null
  const total = availItem.total ?? latestSnapshot?.total ?? localArea.totalCapacity ?? (localArea.spots ? localArea.spots.length : 100)
  const free = availItem.free ?? (latestSnapshot ? latestSnapshot.available : total)
  const occupied = Math.max(0, total - free)
  const occPercent = Math.min(100, Math.max(0, Math.round((occupied / (total || 1)) * 100)))
  const lastUpdatedAt = latestSnapshot?.recordedAt || availItem.updatedAt || null
  const avgOcc =
    analyticsSeries.length > 0
      ? Math.round(analyticsSeries.reduce((sum, s) => sum + Number(s.occupancyRate || 0), 0) / analyticsSeries.length)
      : occPercent
  const peakOcc =
    analyticsSeries.length > 0
      ? Math.max(...analyticsSeries.map((s) => Number(s.occupancyRate || 0)))
      : occPercent
  const minFree =
    analyticsSeries.length > 0
      ? Math.min(...analyticsSeries.map((s) => Number(s.available ?? 0)))
      : free

  const statusTone =
    occPercent >= 90
      ? { tone: 'critical', label: 'Nearly Full', badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' }
      : occPercent >= 70
      ? { tone: 'warning', label: 'Moderate Availability', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' }
      : { tone: 'positive', label: 'High Availability', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(stationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate(auth?.token ? '/dashboard' : '/')
    }
  }

  const handlePayParking = () => {
    if (!localArea?.id) return
    const targetPath = `/dashboard/pay/${localArea.id}`
    if (auth?.token) {
      navigate(targetPath)
    } else if (onOpenLoginModal) {
      onOpenLoginModal({ initialMode: 'signin', redirectTo: targetPath })
    } else {
      navigate('/login')
    }
  }

  const imageUrl = localArea.imageUrl || '/hero-parking.jpg'
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={handleBack}
          data-testid="area-details-back-btn"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Icon name="arrow_back" size={16} />
          <span>Back</span>
        </button>

        {/* Breadcrumb path */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link
            to={auth?.token ? '/dashboard' : '/'}
            className="hover:text-amber-500 transition-colors font-medium"
          >
            {auth?.role === 'motorist' ? 'Motorist Dashboard' : auth?.token ? 'Console' : 'Home'}
          </Link>
          <span>/</span>
          <span className="text-slate-400">Facilities</span>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
            {localArea.name}
          </span>
        </nav>
      </div>

      {/* Main Hero Header Card */}
      <div className="rounded-3xl bg-white dark:bg-[#0d1626] border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col">
        {/* Full-width Image Banner */}
        <div className="relative h-56 sm:h-72 w-full bg-slate-950 overflow-hidden">
          <img
            src={imageUrl}
            alt={localArea.name}
            className="w-full h-full object-cover object-center opacity-85"
            onError={(e) => {
              e.currentTarget.src = '/hero-parking.jpg'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1626] via-slate-950/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
                KCCA Gazetted Facility
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md ${statusTone.badge}`}>
                {statusTone.label}
              </span>
              <span
                data-testid="area-price-badge"
                className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-400 text-slate-950 shadow-md inline-flex items-center gap-1"
              >
                <Icon name="payments" size={14} />
                <span>{localArea.hourlyRate || 'UGX 2,000 / hr'}</span>
              </span>
            </div>

            {/* Station Code Badge */}
            <div className="bg-slate-900/90 border border-amber-400/50 rounded-xl px-3.5 py-1.5 flex items-center gap-2 backdrop-blur-md shadow-md">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-amber-300">Station Code</span>
                <span data-testid="station-code-value" className="text-xs sm:text-sm font-black text-white tracking-wider">
                  {stationCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                data-testid="copy-station-code-btn"
                title="Copy Station Code"
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={14} className={copied ? 'text-emerald-400' : ''} />
              </button>
            </div>
          </div>

          {/* Title & Location Banner */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 id="area-details-title" className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {localArea.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5 font-medium">
              <Icon name="place" size={16} className="text-amber-400 shrink-0" />
              <span>{localArea.location || 'Kampala Municipal District, Uganda'}</span>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Live Telemetry Status Strip */}
          <div
            data-testid="area-live-status"
            className="flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  lastUpdatedAt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {lastUpdatedAt ? 'Live Telemetry Active' : 'Awaiting Live Telemetry'}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {lastUpdatedAt ? `• Updated ${timeAgo(lastUpdatedAt)}` : '• Auto-refreshes every 5s'}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {statusTone.label}
              </span>
              <button
                type="button"
                onClick={handlePayParking}
                data-testid="area-details-pay-btn"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Icon name="payments" size={15} />
                <span>Pay for Parking ({localArea.hourlyRate || 'UGX 2,000 / hr'})</span>
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex flex-col">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-300">
                Free Bays Available
              </span>
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {free}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ready for parking right now
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                Occupied Bays
              </span>
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
                {occupied}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vehicles parked on site
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                Total Monitored Bays
              </span>
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
                {total}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Officially gazetted bay capacity
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                  Occupancy
                </span>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white block mt-1">
                  {occPercent}%
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Live capacity utilization</span>
              </div>
              <div className="shrink-0">
                <Gauge value={occPercent} size={64} stroke={6} />
              </div>
            </div>
          </div>

          {/* Live Occupancy Trend & Recent Telemetry */}
          <div
            data-testid="area-live-stats-panel"
            className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Icon name="monitoring" size={18} className="text-emerald-500" />
                  <span>Live Occupancy Statistics</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time bay utilization and recent snapshots synced from the facility monitor.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                  Avg: {avgOcc}%
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                  Peak: {peakOcc}%
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-700 dark:text-emerald-400">
                  Min Free: {minFree}
                </span>
              </div>
            </div>

            {analyticsSeries.length === 0 ? (
              <div className="p-6 rounded-xl bg-white dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                No telemetry snapshots recorded yet. Live bars and history will appear automatically once monitoring begins.
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-end gap-1.5 h-28" aria-label="Live occupancy trend">
                    {analyticsSeries.map((snap, idx) => {
                      const pct = Math.min(100, Math.max(4, Number(snap.occupancyRate || 0)))
                      const barColor =
                        pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      return (
                        <div
                          key={`${snap.recordedAt || idx}-${idx}`}
                          className="flex-1 h-full flex flex-col justify-end group relative"
                          title={`${snap.time || ''} — ${snap.occupied ?? 0}/${snap.total ?? total} occupied (${snap.occupancyRate ?? 0}%)`}
                        >
                          <div
                            className={`w-full rounded-t-sm transition-all ${barColor}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                    <span>{analyticsSeries[0]?.time || 'Start'}</span>
                    <span>Latest {analyticsSeries.length} snapshots</span>
                    <span>{latestSnapshot?.time || 'Now'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {analyticsSeries.slice(-4).reverse().map((snap, idx) => (
                    <div
                      key={`recent-${snap.recordedAt || idx}-${idx}`}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-0.5"
                    >
                      <span className="text-[10px] font-mono text-slate-400">
                        {snap.recordedAt ? timeAgo(snap.recordedAt) : snap.time}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {snap.available ?? 0} free / {snap.total ?? total}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {snap.occupied ?? 0} occupied ({snap.occupancyRate ?? 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Operating & Enforcement Hours Section */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Icon name="schedule" size={18} className="text-amber-500" />
                <span>Operating &amp; Enforcement Hours</span>
              </h2>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Kampala Capital City Authority
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Mon – Sat (07:00 – 19:00)
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Active municipal parking hours. Uniformed parking wardens on patrol.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  Night Hours (19:00 – 07:00)
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Complimentary free parking overnight. Open access for motorists.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  Sundays &amp; Public Holidays
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Complimentary all-day free civic parking across municipal arcades.
                </span>
              </div>
            </div>
          </div>

          {/* Security Features & Facility Amenities */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Icon name="verified" size={18} className="text-emerald-500" />
              <span>Facility Amenities &amp; Infrastructure</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="videocam" size={20} className="text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">24/7 CCTV</span>
                <span className="text-[10px] text-slate-400">Digital surveillance</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="shield" size={20} className="text-amber-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">KCCA Wardens</span>
                <span className="text-[10px] text-slate-400">On-site patrol</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="wb_sunny" size={20} className="text-amber-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Solar Lighting</span>
                <span className="text-[10px] text-slate-400">Floodlit at night</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="accessible" size={20} className="text-blue-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Accessible Bays</span>
                <span className="text-[10px] text-slate-400">Disabled parking</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="two_wheeler" size={20} className="text-indigo-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Motorcycle Bay</span>
                <span className="text-[10px] text-slate-400">Dedicated parking</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-1.5">
                <Icon name="local_parking" size={20} className="text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Paved Tarmac</span>
                <span className="text-[10px] text-slate-400">Numbered slots</span>
              </div>
            </div>
          </div>

          {/* Interactive GIS Location & Navigation */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Icon name="pin_drop" size={18} className="text-amber-500" />
                <span>Geographical Location &amp; Directions</span>
              </h2>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                GPS: {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E
              </span>
            </div>

            {/* Embedded Mini-Map Container */}
            <div
              id="facility-mini-map"
              data-testid="facility-mini-map"
              ref={mapContainerRef}
              className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner z-0"
            />

            {/* Navigation & Payment Actions */}
            <div className="flex items-center justify-end gap-3 flex-wrap pt-1">
              <button
                type="button"
                onClick={handlePayParking}
                className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Icon name="payments" size={16} />
                <span>Pay for Parking ({localArea.hourlyRate || 'UGX 2,000 / hr'})</span>
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="directions-btn"
                className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Icon name="navigation" size={16} />
                <span>Open in Google Maps GPS Navigation</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
