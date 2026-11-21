import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function FacilityFormPage({
  areas = [],
  auth,
  onCreateArea,
  onUpdateArea,
  onClearSpots,
}) {
  const { areaId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(areaId)
  const existingArea = isEdit ? areas.find((a) => String(a.id) === String(areaId)) : null

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [hourlyRate, setHourlyRate] = useState('UGX 2,000 / hr')
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownersList, setOwnersList] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth?.role === 'admin' && auth?.token) {
      fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (Array.isArray(list)) {
            setOwnersList(
              list.filter((u) => {
                const roles = Array.isArray(u.roles) ? u.roles : [u.role]
                return roles.includes('operator') || roles.includes('admin')
              })
            )
          }
        })
        .catch(() => {})
    }
  }, [auth?.role, auth?.token])

  // Parking Attendants assigned to this area
  const [attendants, setAttendants] = useState([])
  const [attForm, setAttForm] = useState({ username: '', password: '', display_name: '', phone: '' })
  const [attBusy, setAttBusy] = useState(false)
  const [attMsg, setAttMsg] = useState('')

  useEffect(() => {
    if (isEdit && existingArea && auth?.token) {
      fetch(`${API_URL}/attendants?area_id=${encodeURIComponent(existingArea.id)}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setAttendants(Array.isArray(list) ? list : []))
        .catch(() => {})
    }
  }, [isEdit, existingArea?.id, auth?.token])

  const handleAssignAttendant = async (e) => {
    e.preventDefault()
    if (!existingArea || !auth?.token) return
    setAttBusy(true)
    setAttMsg('')
    try {
      const res = await fetch(`${API_URL}/attendants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          ...attForm,
          assigned_area_id: existingArea.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAttMsg(data.detail || 'Failed to assign Parking Attendant')
      } else {
        setAttendants((prev) => [...prev, data.attendant])
        setAttForm({ username: '', password: '', display_name: '', phone: '' })
        setAttMsg(`Assigned Parking Attendant @${data.attendant.username} to ${existingArea.name}.`)
      }
    } catch {
      setAttMsg('Network error assigning Parking Attendant.')
    } finally {
      setAttBusy(false)
    }
  }

  useEffect(() => {
    if (isEdit && existingArea) {
      setName(existingArea.name || '')
      setLocation(existingArea.location || '')
      setCapacity(existingArea.totalCapacity ? String(existingArea.totalCapacity) : '')
      setHourlyRate(existingArea.hourlyRate || 'UGX 2,000 / hr')
      setImageUrl(existingArea.imageUrl || '')
      setVideoUrl(existingArea.videoUrl || '')
      setOwnerUsername(existingArea.owner_username || '')
    }
  }, [isEdit, existingArea])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      setImageUrl(evt.target.result)
    }
    reader.readAsDataURL(file)
  }

  const formatRate = (val) => {
    let formatted = (val || '').trim()
    if (!formatted) return 'UGX 2,000 / hr'
    if (/^\d+$/.test(formatted)) {
      return `UGX ${parseInt(formatted, 10).toLocaleString()} / hr`
    }
    if (!formatted.toUpperCase().startsWith('UGX')) {
      return `UGX ${formatted}`
    }
    return formatted
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmedName = name.trim()
    if (trimmedName.length < 3) {
      setError('Facility name must be at least 3 characters.')
      return
    }

    const payload = {
      name: trimmedName,
      location: location.trim(),
      totalCapacity: parseInt(capacity, 10) || 0,
      hourlyRate: formatRate(hourlyRate),
      imageUrl: imageUrl || '',
      videoUrl: videoUrl.trim(),
      ...(auth?.role === 'admin' ? { owner_username: ownerUsername || null } : {}),
    }

    if (isEdit && existingArea) {
      await onUpdateArea(existingArea.id, payload)
    } else {
      await onCreateArea({
        name: trimmedName,
        location: location.trim(),
        capacity: String(parseInt(capacity, 10) || 0),
        hourlyRate: payload.hourlyRate,
        imageUrl: payload.imageUrl,
        videoUrl: payload.videoUrl,
        ...(auth?.role === 'admin' && ownerUsername ? { owner_username: ownerUsername } : {}),
      })
    }
    navigate('/dashboard/monitor')
  }

  if (isEdit && !existingArea) {
    return (
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-8 text-center flex flex-col items-center gap-3 max-w-xl">
        <Icon name="error" size={32} className="text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Facility Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested parking facility could not be found.
        </p>
        <Button variant="secondary" onClick={() => navigate('/dashboard/monitor')}>
          Back to Parking Facilities
        </Button>
      </div>
    )
  }

  const inputClass =
    'w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="facility-form-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/monitor')}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to Parking Facilities"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              {isEdit ? `Edit ${existingArea.name}` : 'Register Parking Facility'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {isEdit
                ? 'Update facility details, municipal hourly rate, and entrance photo.'
                : 'Add a new Kampala municipal parking lot or street zone.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm font-medium flex items-center gap-2">
          <Icon name="error" size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Facility Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Square Municipal Arcade"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Location / Division
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Central Division, Kampala Road"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Total Capacity (Bays)
              </label>
              <input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 120"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hourly Rate
              </label>
              <input
                type="text"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="e.g. UGX 2,000 / hr"
                className={inputClass}
              />
            </div>

            {auth?.role === 'admin' && (
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Facility Owner (ParkingArea Owner)
                </label>
                <select
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  data-testid="facility-owner-select"
                  className={inputClass}
                >
                  <option value="">Unassigned (Admin only)</option>
                  {ownersList.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.display_name || u.username} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shared Monitor Video URL (Optional)
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="e.g. https://.../parking-lot.mp4 or /videos/parking-lot.mp4"
                data-testid="facility-video-url-input"
                className={inputClass}
              />
              <span className="text-[11px] text-slate-400">
                Shared across all devices in Live Monitor only (never shown on View Details).
              </span>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Facility Photo (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              {imageUrl && (
                <div className="mt-2 h-40 w-full max-w-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
                  <img src={imageUrl} alt="Facility preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {isEdit && (existingArea.spots || []).length > 0 && onClearSpots && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Calibrated Parking Bays ({existingArea.spots.length})
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Reset all marked bay polygons for this facility.
                </span>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Clear all ${existingArea.spots.length} marked bays for ${existingArea.name}?`)) {
                    onClearSpots(existingArea.id)
                  }
                }}
              >
                <Icon name="delete_sweep" size={16} />
                Clear Marked Bays
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard/monitor')}>
            Cancel
          </Button>
          <Button type="submit">
            <Icon name="check" size={18} />
            <span>{isEdit ? 'Save Facility Changes' : 'Register Facility'}</span>
          </Button>
        </div>
      </form>

      {/* Assigned Parking Attendants Section (Edit Mode) */}
      {isEdit && existingArea && (
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Assigned Parking Attendants
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Parking Attendants assigned here can verify vehicle number plates and view payment transaction profiles for {existingArea.name}.
            </p>
          </div>

          {attendants.length > 0 && (
            <div className="flex flex-col gap-2">
              {attendants.map((att) => (
                <div
                  key={att.username}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{att.display_name}</span>
                    <span className="font-mono text-slate-500 ml-2">@{att.username}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Parking Attendant
                  </span>
                </div>
              ))}
            </div>
          )}

          {attMsg && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200">
              {attMsg}
            </div>
          )}

          <form onSubmit={handleAssignAttendant} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <input
              type="text"
              required
              value={attForm.username}
              onChange={(e) => setAttForm({ ...attForm, username: e.target.value })}
              placeholder="Attendant username *"
              className={inputClass}
            />
            <input
              type="password"
              required
              value={attForm.password}
              onChange={(e) => setAttForm({ ...attForm, password: e.target.value })}
              placeholder="Password (min 6 chars) *"
              className={inputClass}
            />
            <input
              type="text"
              value={attForm.display_name}
              onChange={(e) => setAttForm({ ...attForm, display_name: e.target.value })}
              placeholder="Full name"
              className={inputClass}
            />
            <input
              type="tel"
              value={attForm.phone}
              onChange={(e) => setAttForm({ ...attForm, phone: e.target.value })}
              placeholder="Phone (+256...)"
              className={inputClass}
            />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={attBusy}>
                <Icon name="person_add" size={16} />
                <span>{attBusy ? 'Assigning...' : 'Assign Parking Attendant'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
