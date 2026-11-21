/**
 * Official KCCA Station Codes mapping and generator
 * Used for entrance signage and facility identification
 */

const KNOWN_CODES = {
  1700000000001: 'KCCA-CSQ-01', // City Square Municipal Arcade
  1700000000002: 'KCCA-LGG-02', // Lugogo Mall Multi-Deck
  1700000000003: 'KCCA-KSN-03', // Kisenyi Transit Bay
  1700000000004: 'KCCA-BKT-04', // Bukoto Hardware Yard
  1794938716146: 'KCCA-KLL-05', // Kololo Airstrip Lot
  1794938783201: 'KCCA-KLL-05', // Kololo Airstrip Lot
}

export function getStationCode(area) {
  if (!area) return 'KCCA-PKW-00'
  const id = area.id
  if (KNOWN_CODES[id]) return KNOWN_CODES[id]
  if (area.stationCode) return area.stationCode

  // Derive from name
  const name = (area.name || '').toUpperCase().replace(/[^A-Z]/g, '')
  const prefix = name.slice(0, 3) || 'PKW'
  const suffix = String(id).slice(-2).padStart(2, '0')
  return `KCCA-${prefix}-${suffix}`
}
