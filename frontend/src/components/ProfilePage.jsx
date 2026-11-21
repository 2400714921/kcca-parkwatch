import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function ProfilePage({ auth, onProfileUpdated }) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(auth?.displayName || auth?.username || '')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!auth?.token) return
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
  }, [auth?.token, auth?.username])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (newPassword && !currentPassword) {
      setError('Please enter your current password to set a new password.')
      return
    }
    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters long.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        display_name: displayName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }
      if (newPassword) {
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }

      const res = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to update profile.')
      } else {
        setSuccess('Account profile updated successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        if (onProfileUpdated && data.user) {
          onProfileUpdated(data.user)
        }
      }
    } catch {
      setError('Network error communicating with backend.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="profile-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Go back"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              My Profile
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Manage your account details, contact information, and password.
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

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-2">
          <Icon name="check_circle" size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-lg">
        {/* Account Details Card */}
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-base">
                {(displayName || auth?.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Account Information</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  @{auth?.username} · {auth?.role}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+256 700 000000"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave blank if you do not want to change your password.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            <Icon name="check" size={18} />
            <span>{busy ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
