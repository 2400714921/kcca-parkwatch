import React, { useState, useEffect } from 'react'
import { Icon, Button } from './ui'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export default function UpdateProfileModal({ isOpen, onClose, auth, onProfileUpdated }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setError('')
      setSuccess('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      return
    }

    // Pre-populate profile data
    if (auth?.token) {
      fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setDisplayName(data.display_name || auth.username || '')
            setEmail(data.email || '')
            setPhone(data.phone || '')
          }
        })
        .catch(() => {})
    }
  }, [isOpen, auth])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.')
        return
      }
    }

    setBusy(true)

    try {
      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          email,
          phone,
          current_password: currentPassword || null,
          new_password: newPassword || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Failed to update profile')
        return
      }

      setSuccess('Profile updated successfully!')
      if (onProfileUpdated) {
        onProfileUpdated(data.user)
      }
      setTimeout(() => {
        onClose()
      }, 900)
    } catch {
      setError('Cannot connect to backend server.')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full h-11 px-space-md rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-body-md text-body-md focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-700 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition-all'

  return (
    <div
      data-testid="update-profile-modal"
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

        <form onSubmit={handleSubmit} className="p-space-xl flex flex-col gap-space-lg">
          <div className="flex items-start justify-between gap-space-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-lg shrink-0">
                {auth?.username ? auth.username[0].toUpperCase() : 'O'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-800 dark:text-emerald-400">
                  Operator Account
                </span>
                <h2 className="font-headline-md text-headline-md text-slate-900 dark:text-white font-bold">
                  Update Profile
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Username: <strong className="text-slate-700 dark:text-slate-300 font-mono">@{auth?.username}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="close-profile-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 text-xs"
            >
              <Icon name="error" size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg px-3 py-2 text-xs"
            >
              <Icon name="check" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex flex-col gap-3.5 max-h-[50vh] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Display / Full Name
              </label>
              <input
                id="profileDisplayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Anthony Kimbugwe"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="profileEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@kcca.go.ug"
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Contact Phone
                </label>
                <input
                  id="profilePhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256 700 000 000"
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Change Password Section */}
            <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Change Password (Optional)
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Current Password
                </label>
                <input
                  id="profileCurrentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required only if changing password"
                  autoComplete="current-password"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    New Password
                  </label>
                  <input
                    id="profileNewPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    className={fieldClass}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Confirm New Password
                  </label>
                  <input
                    id="profileConfirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={fieldClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button data-testid="save-profile-btn" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
