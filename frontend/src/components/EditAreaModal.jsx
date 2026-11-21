import React, { useState, useEffect } from 'react'
import { Icon, Button } from './ui'

export default function EditAreaModal({
  isOpen,
  onClose,
  area,
  onSave,
  onClearSpots,
}) {
  const [form, setForm] = useState({
    name: '',
    location: '',
    hourlyRate: 'UGX 2,000 / hr',
    capacity: '',
    imageUrl: '',
  })
  const [clearingSlots, setClearingSlots] = useState(false)

  // Populate form when modal opens or area changes
  useEffect(() => {
    if (area) {
      setForm({
        name: area.name || '',
        location: area.location || '',
        hourlyRate: area.hourlyRate || 'UGX 2,000 / hr',
        capacity: area.totalCapacity || area.capacity || '',
        imageUrl: area.imageUrl || '',
      })
    }
  }, [area, isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !area) return null

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      setForm((prev) => ({ ...prev, imageUrl: evt.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.name.trim().length < 3) return

    let formattedRate = (form.hourlyRate || '').trim()
    if (!formattedRate) {
      formattedRate = 'UGX 2,000 / hr'
    } else if (/^\d+$/.test(formattedRate)) {
      formattedRate = `UGX ${parseInt(formattedRate, 10).toLocaleString()} / hr`
    } else if (!formattedRate.toUpperCase().startsWith('UGX')) {
      formattedRate = `UGX ${formattedRate}`
    }

    onSave(area.id, {
      name: form.name.trim(),
      location: form.location.trim(),
      hourlyRate: formattedRate,
      totalCapacity: parseInt(form.capacity, 10) || 0,
      imageUrl: form.imageUrl || '',
    })
    onClose()
  }

  const handleClearSlotsClick = () => {
    if (window.confirm(`Clear all ${(area.spots || []).length} calibrated video bays for ${area.name}?`)) {
      setClearingSlots(true)
      if (onClearSpots) {
        onClearSpots(area.id)
      }
      setTimeout(() => setClearingSlots(false), 500)
    }
  }

  const fieldClass =
    'w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:bg-white dark:focus:bg-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all'

  const spotsCount = (area.spots || []).length

  return (
    <div
      data-testid="edit-area-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden transition-colors max-h-[90vh] flex flex-col">
        {/* Tricolor Uganda/KCCA brand accent strip */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-emerald-600" />
          <div className="w-1/3 bg-amber-400" />
          <div className="w-1/3 bg-red-600" />
        </div>

        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-400">
              Civic Infrastructure • Operator Console
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Update Parking Facility
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modify facility parameters, municipal billing rate, photo, or clear calibrated bay markings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 overflow-y-auto flex flex-col gap-5 grow">
          {/* Facility Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="editAreaName"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Facility Name <span className="text-amber-500">*</span>
            </label>
            <input
              id="editAreaName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., City Square Arcade Yard"
              className={`${fieldClass} border-slate-200 dark:border-slate-700`}
              required
            />
          </div>

          {/* Location / Street Address */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="editAreaLocation"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Location / Street Address
            </label>
            <input
              id="editAreaLocation"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Central Division, Kampala Road"
              className={`${fieldClass} border-slate-200 dark:border-slate-700`}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Format as <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400 font-mono">Zone, Street</code>. The zone segment automatically becomes its directory filter chip.
            </p>
          </div>

          {/* Grid row: Rate Per Hour & Nominal Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="editAreaRate"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                Rate Per Hour (UGX)
              </label>
              <input
                id="editAreaRate"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                placeholder="e.g., 2000 or UGX 2,500 / hr"
                className={`${fieldClass} border-slate-200 dark:border-slate-700`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="editAreaCapacity"
                className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                Nominal Capacity
              </label>
              <input
                id="editAreaCapacity"
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="e.g., 50"
                className={`${fieldClass} border-slate-200 dark:border-slate-700`}
              />
            </div>
          </div>

          {/* Facility Photo Upload & Preview */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Facility Photo (shows motorists what it looks like)
            </label>
            <div className="flex items-center gap-4">
              {form.imageUrl ? (
                <div className="relative w-28 h-18 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 shadow-sm">
                  <img src={form.imageUrl} alt="Facility preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                    className="absolute top-1 right-1 bg-black/75 hover:bg-black text-white p-1 rounded-full text-xs cursor-pointer"
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-28 h-18 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-slate-50 dark:bg-slate-850">
                  <Icon name="upload_file" size={22} />
                  <span className="text-[10px] mt-0.5">No Photo</span>
                </div>
              )}
              <div className="flex flex-col gap-1 grow">
                <input
                  type="file"
                  id="editFacilityPhotoUpload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <label
                  htmlFor="editFacilityPhotoUpload"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer w-fit flex items-center gap-1.5 transition-colors"
                >
                  <Icon name="upload_file" size={16} />
                  <span>{form.imageUrl ? 'Replace Photo' : 'Upload Facility Photo'}</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  JPG, PNG, or WebP. Displays on public landing page cards.
                </span>
              </div>
            </div>
          </div>

          {/* Calibrated Parking Spots Management Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Icon name="straighten" size={16} className="text-amber-500" />
                <span>Configured Camera Bays</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {spotsCount > 0
                  ? `${spotsCount} calibrated video bays registered for this area`
                  : 'No video bays marked yet (marking is calibrated via camera surveillance)'}
              </span>
            </div>

            {spotsCount > 0 && (
              <button
                type="button"
                onClick={handleClearSlotsClick}
                disabled={clearingSlots}
                className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <Icon name="delete_sweep" size={16} />
                <span>{clearingSlots ? 'Clearing…' : `Clear All Bays (${spotsCount})`}</span>
              </button>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.name.trim() || form.name.trim().length < 3}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black border-0 shadow-md"
            >
              <Icon name="check" size={18} />
              <span>Save Facility Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
