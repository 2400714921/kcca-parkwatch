module.exports = (n) => JSON.stringify(
  ['Kisenyi Landing Hotel', 'City Square Arcade', 'Bukoto Hardware Yard', 'Nakawa Transit Bay']
    .slice(0, n)
    .map((name, i) => ({
      id: 1700000000000 + i, name, createdAt: '2026-09-01T08:00:00.000Z',
      location: ['Central Division, Nyerere Rd', 'Central Division, Kampala Rd', 'Nakawa, Jinja Road', 'Kololo, Kyadondo Rd'][i],
      totalCapacity: [120, 372, 60, 200][i],
      spots: Array.from({ length: [120, 372, 60, 200][i] }, (_, s) => ({ id: s, x1: s % 10 * 40, y1: Math.floor(s / 10) * 40, x2: s % 10 * 40 + 36, y2: Math.floor(s / 10) * 40 + 36 })),
      spotDimensions: { width: 1280, height: 720 },
      analytics: Array.from({ length: 30 }, (_, t) => {
        const occ = Math.round(([96, 120, 58, 190][i]) * (0.6 + 0.4 * Math.sin(t / 4)))
        return { timestamp: t * 15, time: `00:${String(t).padStart(2, '0')}`, recordedAt: Date.now() - t * 60000, occupied: occ, available: [120, 372, 60, 200][i] - occ, total: [120, 372, 60, 200][i], occupancyRate: ((occ / [120, 372, 60, 200][i]) * 100).toFixed(1) }
      })
    }))
)

