import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Icon } from './ui'
import { getStationCode } from '../utils/stationCodes'

// Default division coordinates fallbacks around Kampala
const DIVISION_COORDS = {
  central: [0.3136, 32.5811],
  nakawa: [0.3276, 32.6074],
  kawempe: [0.3540, 32.5930],
  rubaga: [0.3020, 32.5530],
  makindye: [0.2920, 32.5860],
}

function getFacilityCoords(entry, index) {
  const area = entry.area || entry
  if (area.lat && area.lng) {
    return [Number(area.lat), Number(area.lng)]
  }
  const loc = (area.location || '').toLowerCase()
  for (const [div, coords] of Object.entries(DIVISION_COORDS)) {
    if (loc.includes(div)) {
      // Slightly jitter multiple facilities in the same division
      const offsetLat = ((index % 5) - 2) * 0.003
      const offsetLng = (((index * 3) % 5) - 2) * 0.003
      return [coords[0] + offsetLat, coords[1] + offsetLng]
    }
  }
  // Default central Kampala with index-based spiral jitter
  return [0.3150 + ((index % 4) - 1.5) * 0.005, 32.5810 + (((index * 2) % 4) - 1.5) * 0.005]
}

function createMarkerIcon(free, total) {
  const isAvailable = free > 15
  const isNear = free > 0 && free <= 15
  const color = isAvailable ? '#10b981' : isNear ? '#f59e0b' : '#ef4444'
  const textColor = isAvailable ? '#064e3b' : isNear ? '#78350f' : '#7f1d1d'
  const bgLight = isAvailable ? '#ecfdf5' : isNear ? '#fffbeb' : '#fef2f2'

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      cursor: pointer;
    ">
      <div style="
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${color};
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2.5px solid #ffffff;
      "></div>
      <div style="
        position: relative;
        z-index: 2;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: ${bgLight};
        color: ${textColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 11px;
        font-family: system-ui, sans-serif;
        margin-top: -3px;
        margin-left: 1px;
      ">
        ${free > 0 ? free : '✕'}
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'kcca-map-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -40],
  })
}

export default function KampalaParkingMap({
  facilities = [],
  focusedFacilityId = null,
  onSelectFacility,
  onClose,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const [activeDivision, setActiveDivision] = useState('all')

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Prevent duplicate map instances
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [0.3200, 32.5850],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    })

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors • KCCA GIS',
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Sync Markers when facilities change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove())
    markersRef.current = {}

    const bounds = L.latLngBounds()
    let count = 0

    facilities.forEach((item, index) => {
      const area = item.area || item
      const coords = getFacilityCoords(item, index)
      const free = item.free ?? area.totalCapacity ?? 0
      const total = item.total ?? area.totalCapacity ?? 0
      const divisionTag = area.division ? `${area.division.toUpperCase()}` : 'MUNICIPAL'
      const imageUrl = item.imageUrl || area.imageUrl || '/hero-parking.jpg'

      const marker = L.marker(coords, {
        icon: createMarkerIcon(free, total),
        title: area.name,
      })

      const stationCode = getStationCode(area)
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 210px; padding: 2px;">
          <div style="height: 100px; width: 100%; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #0f172a; position: relative;">
            <img src="${imageUrl}" alt="${area.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/hero-parking.jpg'" />
            <span style="position: absolute; top: 6px; left: 6px; background: rgba(15, 23, 42, 0.85); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; border: 1px solid rgba(245, 158, 11, 0.4);">
              ${stationCode}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; line-height: 1.2; margin-bottom: 4px;">
            ${area.name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            📍 ${area.location || 'Kampala Municipal District'}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 700; font-size: 11px; color: ${free > 0 ? '#059669' : '#dc2626'}; background: ${free > 0 ? '#ecfdf5' : '#fef2f2'}; padding: 3px 8px; border-radius: 6px;">
              ${free} / ${total} Bays Free
            </span>
            <span style="font-weight: 700; font-size: 10px; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              🏛️ ${divisionTag}
            </span>
          </div>
          <button id="focus-btn-${area.id}" data-testid="map-popup-details-${area.id}" style="
            width: 100%;
            background: #f59e0b;
            color: #0f172a;
            border: none;
            padding: 8px 10px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">
            <span>🔍 View Facility Details →</span>
          </button>
        </div>
      `

      marker.bindPopup(popupHtml, { maxWidth: 260 })

      marker.on('popupopen', () => {
        const btn = document.getElementById(`focus-btn-${area.id}`)
        if (btn) {
          btn.onclick = () => {
            if (onSelectFacility) onSelectFacility(area)
          }
        }
      })

      marker.addTo(map)
      markersRef.current[String(area.id)] = marker
      bounds.extend(coords)
      count++
    })

    // If focusedFacilityId is set, zoom directly to it
    if (focusedFacilityId && markersRef.current[String(focusedFacilityId)]) {
      const targetMarker = markersRef.current[String(focusedFacilityId)]
      map.flyTo(targetMarker.getLatLng(), 15, { duration: 1 })
      targetMarker.openPopup()
    } else if (count > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
  }, [facilities, focusedFacilityId, onSelectFacility])

  const handleFitAll = () => {
    const map = mapInstanceRef.current
    if (!map) return
    const bounds = L.latLngBounds()
    let count = 0
    Object.values(markersRef.current).forEach((m) => {
      bounds.extend(m.getLatLng())
      count++
    })
    if (count > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    }
  }

  return (
    <div className="w-full bg-white dark:bg-[#151f30] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition-all animate-in fade-in duration-300">
      {/* Map Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
            <Icon name="pin_drop" size={20} />
          </div>
          <div>
            <h3 className="font-headline-sm text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Kampala Live Parking GIS Map</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {facilities.length} Active Hubs
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any pin to inspect real-time bay availability and rates
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFitAll}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Fit all markers in view"
          >
            <Icon name="fit_screen" size={16} />
            <span>Fit All</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Icon name="close" size={16} />
              <span>Close Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-80 sm:h-96 md:h-[460px] bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Near Full</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Full</span>
          </div>
        </div>
      </div>
    </div>
  )
}
