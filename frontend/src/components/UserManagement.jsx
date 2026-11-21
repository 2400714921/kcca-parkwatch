import React, { useState, useEffect } from 'react'
import { Icon, Button, EmptyState } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function UserManagement({ auth }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('table')
  const [feedback, setFeedback] = useState(null)

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  // Form states
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    role: 'motorist',
    roles: ['motorist'],
    display_name: '',
    email: '',
    phone: '',
    is_active: true,
  })

  const [editForm, setEditForm] = useState({
    role: 'motorist',
    roles: ['motorist'],
    display_name: '',
    email: '',
    phone: '',
    password: '',
    is_active: true,
  })

  const showFeedback = (type, message) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  const fetchUsers = async () => {
    if (!auth?.token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied: Administrator privileges required.')
        }
        throw new Error(`Failed to load users: ${res.statusText}`)
      }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error communicating with authentication server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [auth?.token])

  const handleToggleActive = async (user) => {
    if (user.username === auth?.username) {
      showFeedback('error', 'You cannot deactivate your own logged-in account.')
      return
    }
    const currentActive = user.is_active !== false
    const newActive = !currentActive
    try {
      const res = await fetch(`${API_URL}/auth/users/${user.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ is_active: newActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update account status')
      }
      showFeedback(
        'success',
        `Account '@${user.username}' has been ${newActive ? 'activated' : 'deactivated'}.`
      )
      setUsers((prev) =>
        prev.map((u) => (u.username === user.username ? { ...u, is_active: newActive } : u))
      )
    } catch (err) {
      showFeedback('error', err.message || 'Error updating account status.')
    }
  }

  const handleOpenCreate = () => {
    setCreateForm({
      username: '',
      password: '',
      role: 'motorist',
      roles: ['motorist'],
      display_name: '',
      email: '',
      phone: '',
      is_active: true,
    })
    setModalError('')
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!createForm.username.trim() || !createForm.password.trim()) {
      setModalError('Username and password are required.')
      return
    }
    if (createForm.password.length < 6) {
      setModalError('Password must be at least 6 characters long.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).join('; ')
          : data.detail
        throw new Error(msg || 'Failed to create user')
      }

      setCreateModalOpen(false)
      showFeedback('success', `User account '${data.user?.username || createForm.username}' created successfully.`)
      fetchUsers()
    } catch (err) {
      setModalError(err.message || 'Error creating user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (user) => {
    const uRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role || 'motorist']
    setEditingUser(user)
    setEditForm({
      role: uRoles[0],
      roles: uRoles,
      display_name: user.display_name || user.username,
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      is_active: user.is_active !== false,
    })
    setModalError('')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingUser) return
    setModalError('')
    if (editForm.password && editForm.password.length < 6) {
      setModalError('Password must be at least 6 characters long.')
      return
    }
    if (!editForm.roles || editForm.roles.length === 0) {
      setModalError('Select at least one role for this account.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        role: editForm.roles[0],
        roles: editForm.roles,
        display_name: editForm.display_name,
        email: editForm.email,
        phone: editForm.phone,
        is_active: editForm.is_active,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }

      const res = await fetch(`${API_URL}/auth/users/${editingUser.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((d) => (typeof d === 'string' ? d : d.msg)).join('; ')
          : data.detail
        throw new Error(msg || 'Failed to update user')
      }

      setEditingUser(null)
      showFeedback('success', `User account '${data.user?.username || editingUser.username}' updated successfully.`)
      fetchUsers()
    } catch (err) {
      setModalError(err.message || 'Error updating user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmUser) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/auth/users/${deleteConfirmUser.username}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete user')
      }

      showFeedback('success', `Account '${deleteConfirmUser.username}' deleted successfully.`)
      setDeleteConfirmUser(null)
      fetchUsers()
    } catch (err) {
      showFeedback('error', err.message || 'Error deleting account.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    const isActive = u.is_active !== false
    if (statusFilter === 'active' && !isActive) return false
    if (statusFilter === 'deactivated' && isActive) return false

    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    if (createModalOpen) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-create-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateModalOpen(false)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Create User Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Register a new motorist, station operator, or administrator.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. nakawa_operator"
                data-testid="create-username-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min. 6 characters"
                data-testid="create-password-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="create-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (createForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? createForm.roles.filter((x) => x !== r.id)
                            : [...createForm.roles, r.id]
                          setCreateForm({
                            ...createForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {createForm.is_active ? 'Active — Account can sign in immediately.' : 'Deactivated — Login disabled.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                data-testid="create-active-checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-submit-btn">
              <Icon name="person_add" size={18} />
              <span>{submitting ? 'Creating…' : 'Create Account'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (editingUser) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-edit-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Edit Account: @{editingUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Update profile metadata, role permissions, or reset password.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="edit-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (editForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        data-testid={`edit-role-checkbox-${r.id}`}
                        onChange={() => {
                          const next = checked
                            ? editForm.roles.filter((x) => x !== r.id)
                            : [...editForm.roles, r.id]
                          setEditForm({
                            ...editForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {editForm.is_active
                  ? 'Active — Account can log in and access authorized portals.'
                  : 'Deactivated — Account is suspended and cannot log in.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                disabled={editingUser?.username === auth?.username}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                data-testid="edit-active-checkbox"
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                editingUser?.username === auth?.username ? 'opacity-50 cursor-not-allowed' : ''
              } bg-slate-200 dark:bg-slate-700 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Icon name="lock_reset" size={16} />
              <span>Reset Password (Optional)</span>
            </span>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep existing password"
              data-testid="edit-password-input"
              className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="edit-submit-btn">
              <Icon name={submitting ? 'sync' : 'save'} size={18} className={submitting ? 'animate-spin' : ''} />
              <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })

  // Counts
  const totalCount = users.length
  const adminCount = users.filter((u) => u.role === 'admin').length
  const operatorCount = users.filter((u) => u.role === 'operator').length
  const motoristCount = users.filter((u) => u.role === 'motorist').length
  const activeCount = users.filter((u) => u.is_active !== false).length
  const deactivatedCount = users.filter((u) => u.is_active === false).length

  if (createModalOpen) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-create-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateModalOpen(false)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Create User Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Register a new motorist, station operator, or administrator.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. nakawa_operator"
                data-testid="create-username-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min. 6 characters"
                data-testid="create-password-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="create-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (createForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? createForm.roles.filter((x) => x !== r.id)
                            : [...createForm.roles, r.id]
                          setCreateForm({
                            ...createForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {createForm.is_active ? 'Active — Account can sign in immediately.' : 'Deactivated — Login disabled.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                data-testid="create-active-checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-submit-btn">
              <Icon name="person_add" size={18} />
              <span>{submitting ? 'Creating…' : 'Create Account'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (editingUser) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-edit-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Edit Account: @{editingUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Update profile metadata, role permissions, or reset password.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="edit-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (editForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        data-testid={`edit-role-checkbox-${r.id}`}
                        onChange={() => {
                          const next = checked
                            ? editForm.roles.filter((x) => x !== r.id)
                            : [...editForm.roles, r.id]
                          setEditForm({
                            ...editForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {editForm.is_active
                  ? 'Active — Account can log in and access authorized portals.'
                  : 'Deactivated — Account is suspended and cannot log in.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                disabled={editingUser?.username === auth?.username}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                data-testid="edit-active-checkbox"
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                editingUser?.username === auth?.username ? 'opacity-50 cursor-not-allowed' : ''
              } bg-slate-200 dark:bg-slate-700 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Icon name="lock_reset" size={16} />
              <span>Reset Password (Optional)</span>
            </span>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep existing password"
              data-testid="edit-password-input"
              className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="edit-submit-btn">
              <Icon name={submitting ? 'sync' : 'save'} size={18} className={submitting ? 'animate-spin' : ''} />
              <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          data-testid="user-management-toast"
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800'
          }`}
        >
          <Icon
            name={feedback.type === 'success' ? 'check_circle' : 'error'}
            size={20}
            className={feedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}
          />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-lg text-headline-lg text-slate-900 dark:text-white font-black tracking-tight">
              User &amp; Citizen Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
              Admin Only
            </span>
          </div>
          <p className="font-body-md text-body-md text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Govern system access, manage security credentials, toggle account activation, and inspect citizens, operators, and administrators.
          </p>
        </div>

        <Button onClick={handleOpenCreate} data-testid="add-user-btn">
          <Icon name="person_add" size={18} />
          <span>Add New Account</span>
        </Button>
      </div>

      {/* Metric Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Accounts
            </span>
            <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">
              {totalCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {activeCount} active · {deactivatedCount} deactivated
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
            <Icon name="group" size={24} />
          </div>
        </div>

        {/* Administrators */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Administrators
            </span>
            <span className="block text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {adminCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              City Authority IT
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
            <Icon name="admin_panel_settings" size={24} />
          </div>
        </div>

        {/* Console Operators */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Station Operators
            </span>
            <span className="block text-3xl font-black text-blue-700 dark:text-blue-400 mt-1">
              {operatorCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Arcade &amp; Bay Wardens
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
            <Icon name="videocam" size={24} />
          </div>
        </div>

        {/* Citizen Motorists */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Citizen Motorists
            </span>
            <span className="block text-3xl font-black text-amber-700 dark:text-amber-400 mt-1">
              {motoristCount}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Registered Public Drivers
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold">
            <Icon name="directions_car" size={24} />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar (Two-tier so filters never squeeze) */}
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-4 shadow-xs flex flex-col gap-3">
        {/* Row 1: Search + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username, name, email…"
              data-testid="user-search-input"
              className="w-full h-10 pl-10 pr-8 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600"
            />
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Clear search"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mr-1">
              {filteredUsers.length} of {users.length}
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                data-testid="users-view-grid"
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="grid_view" size={15} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                data-testid="users-view-table"
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <Icon name="table_rows" size={15} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Role and Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Role Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'admin'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Admins ({adminCount})
            </button>
            <button
              onClick={() => setRoleFilter('operator')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'operator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Operators ({operatorCount})
            </button>
            <button
              onClick={() => setRoleFilter('motorist')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                roleFilter === 'motorist'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Citizens ({motoristCount})
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('deactivated')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'deactivated'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Deactivated ({deactivatedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table / Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#151f30] rounded-2xl border border-slate-200 dark:border-[#273549] flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-bold">Loading security registry…</span>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-900 dark:text-red-200">
          <Icon name="error" size={24} className="text-red-500 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-sm">Failed to Load User Registry</span>
            <span className="text-xs mt-0.5">{error}</span>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No users match your criteria"
          body="Try resetting the filters, search query, or provisioning a new user."
          action={
            <Button onClick={handleOpenCreate} className="mt-2">
              <Icon name="person_add" size={18} />
              Add User
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="users-grid">
          {filteredUsers.map((user) => {
            const isCurrentAuth = user.username === auth?.username
            const isAdmin = user.role === 'admin'
            const isOperator = user.role === 'operator'
            const isActive = user.is_active !== false

            if (createModalOpen) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-create-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateModalOpen(false)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Create User Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Register a new motorist, station operator, or administrator.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. nakawa_operator"
                data-testid="create-username-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min. 6 characters"
                data-testid="create-password-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="create-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (createForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? createForm.roles.filter((x) => x !== r.id)
                            : [...createForm.roles, r.id]
                          setCreateForm({
                            ...createForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {createForm.is_active ? 'Active — Account can sign in immediately.' : 'Deactivated — Login disabled.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                data-testid="create-active-checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-submit-btn">
              <Icon name="person_add" size={18} />
              <span>{submitting ? 'Creating…' : 'Create Account'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (editingUser) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-edit-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Edit Account: @{editingUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Update profile metadata, role permissions, or reset password.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="edit-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (editForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        data-testid={`edit-role-checkbox-${r.id}`}
                        onChange={() => {
                          const next = checked
                            ? editForm.roles.filter((x) => x !== r.id)
                            : [...editForm.roles, r.id]
                          setEditForm({
                            ...editForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {editForm.is_active
                  ? 'Active — Account can log in and access authorized portals.'
                  : 'Deactivated — Account is suspended and cannot log in.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                disabled={editingUser?.username === auth?.username}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                data-testid="edit-active-checkbox"
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                editingUser?.username === auth?.username ? 'opacity-50 cursor-not-allowed' : ''
              } bg-slate-200 dark:bg-slate-700 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Icon name="lock_reset" size={16} />
              <span>Reset Password (Optional)</span>
            </span>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep existing password"
              data-testid="edit-password-input"
              className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="edit-submit-btn">
              <Icon name={submitting ? 'sync' : 'save'} size={18} className={submitting ? 'animate-spin' : ''} />
              <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
              <div
                key={user.username}
                data-testid={`user-card-${user.username}`}
                className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                        isAdmin
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : isOperator
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {(user.display_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        @{user.username}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {isActive ? 'Active' : 'Deactivated'}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Role</span>
                    <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{user.role}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">Email</span>
                    <span className="truncate">{user.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">Phone</span>
                    <span className="tabular-nums truncate">{user.phone || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(user)}
                    disabled={isCurrentAuth}
                    className={`p-2 rounded-lg transition-colors ${
                      isCurrentAuth
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer'
                    }`}
                    title={isActive ? 'Deactivate account' : 'Activate account'}
                  >
                    <Icon name={isActive ? 'block' : 'check_circle'} size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(user)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="Edit user details, role, or reset password"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmUser(user)}
                    disabled={isCurrentAuth}
                    className={`p-2 rounded-lg transition-colors ${
                      isCurrentAuth
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-700 dark:text-slate-300 hover:text-red-600 cursor-pointer'
                    }`}
                    title={isCurrentAuth ? 'Cannot delete your own active session' : 'Delete user account'}
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" data-testid="users-table">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">User &amp; Identity</th>
                  <th className="py-3.5 px-4">Role &amp; Privilege</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Contact Info</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filteredUsers.map((user) => {
                  const isCurrentAuth = user.username === auth?.username
                  const isAdmin = user.role === 'admin'
                  const isOperator = user.role === 'operator'
                  const isMotorist = user.role === 'motorist'
                  const isActive = user.is_active !== false

                  if (createModalOpen) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-create-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateModalOpen(false)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Create User Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Register a new motorist, station operator, or administrator.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. nakawa_operator"
                data-testid="create-username-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Initial Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min. 6 characters"
                data-testid="create-password-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="create-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (createForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? createForm.roles.filter((x) => x !== r.id)
                            : [...createForm.roles, r.id]
                          setCreateForm({
                            ...createForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {createForm.is_active ? 'Active — Account can sign in immediately.' : 'Deactivated — Login disabled.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                data-testid="create-active-checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="create-submit-btn">
              <Icon name="person_add" size={18} />
              <span>{submitting ? 'Creating…' : 'Create Account'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (editingUser) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="user-edit-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingUser(null)}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
            title="Back to User Management"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
              Edit Account: @{editingUser.username}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Update profile metadata, role permissions, or reset password.
            </p>
          </div>
        </div>

        {modalError && (
          <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
            <Icon name="error" size={18} className="text-red-500 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="e.g. Samuel Mugisha"
                data-testid="edit-displayname-input"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="user@kcca.go.ug"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className="w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Roles * (Select one or more)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'motorist', label: 'Driver' },
                  { id: 'operator', label: 'ParkingArea Owner' },
                  { id: 'warden', label: 'Parking Attendant' },
                  { id: 'admin', label: 'City Admin' },
                ].map((r) => {
                  const checked = (editForm.roles || []).includes(r.id)
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        data-testid={`edit-role-checkbox-${r.id}`}
                        onChange={() => {
                          const next = checked
                            ? editForm.roles.filter((x) => x !== r.id)
                            : [...editForm.roles, r.id]
                          setEditForm({
                            ...editForm,
                            roles: next,
                            role: next[0] || 'motorist',
                          })
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
              <span className="text-[11px] text-slate-500">
                {editForm.is_active
                  ? 'Active — Account can log in and access authorized portals.'
                  : 'Deactivated — Account is suspended and cannot log in.'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                disabled={editingUser?.username === auth?.username}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                data-testid="edit-active-checkbox"
                className="sr-only peer"
              />
              <div className={`w-11 h-6 rounded-full peer transition-colors ${
                editingUser?.username === auth?.username ? 'opacity-50 cursor-not-allowed' : ''
              } bg-slate-200 dark:bg-slate-700 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
            </label>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Icon name="lock_reset" size={16} />
              <span>Reset Password (Optional)</span>
            </span>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep existing password"
              data-testid="edit-password-input"
              className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} data-testid="edit-submit-btn">
              <Icon name={submitting ? 'sync' : 'save'} size={18} className={submitting ? 'animate-spin' : ''} />
              <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
                    <tr
                      key={user.username}
                      data-testid={`user-row-${user.username}`}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Identity Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                              isAdmin
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : isOperator
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {(user.display_name || user.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white truncate">
                                {user.display_name || user.username}
                              </span>
                              {isCurrentAuth && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/40">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            isAdmin
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : isOperator
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          <Icon
                            name={isAdmin ? 'admin_panel_settings' : isOperator ? 'videocam' : 'directions_car'}
                            size={14}
                          />
                          <span>
                            {isAdmin ? 'Administrator' : isOperator ? 'Station Operator' : 'Citizen Motorist'}
                          </span>
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-4">
                        <span
                          data-testid={`user-status-${user.username}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            }`}
                          />
                          <span>{isActive ? 'Active' : 'Deactivated'}</span>
                        </span>
                      </td>

                      {/* Contact Info Column */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                          {user.email ? (
                            <span className="flex items-center gap-1.5 truncate">
                              <Icon name="mail" size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No email set</span>
                          )}
                          {user.phone ? (
                            <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <Icon name="call" size={13} className="text-slate-400 shrink-0" />
                              <span>{user.phone}</span>
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Action Controls */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Active / Deactivate */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user)}
                            disabled={isCurrentAuth}
                            data-testid={`toggle-active-${user.username}`}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              isCurrentAuth
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                : isActive
                                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300'
                            }`}
                            title={
                              isCurrentAuth
                                ? 'Cannot deactivate your own active session'
                                : isActive
                                ? 'Deactivate account (suspend motorist/operator access)'
                                : 'Activate account (restore login access)'
                            }
                          >
                            <Icon name={isActive ? 'block' : 'check_circle'} size={16} />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            data-testid={`edit-user-${user.username}`}
                            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 hover:text-amber-800 dark:hover:text-amber-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Edit user details, role, or reset password"
                          >
                            <Icon name="edit" size={16} />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmUser(user)}
                            disabled={isCurrentAuth}
                            data-testid={`delete-user-${user.username}`}
                            className={`p-2 rounded-lg transition-colors ${
                              isCurrentAuth
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                            }`}
                            title={isCurrentAuth ? 'Cannot delete your own active session' : 'Delete user account'}
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW USER
          ========================================================================= */}
      {createModalOpen && (
        <div
          data-testid="create-user-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#151f30] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                  <Icon name="person_add" size={20} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-black text-slate-900 dark:text-white">
                    Create User Account
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register a new station operator or administrator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <Icon name="error" size={16} className="text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="e.g. nakawa_operator"
                    data-testid="create-username-input"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    data-testid="create-password-input"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                  placeholder="e.g. Samuel Mugisha"
                  data-testid="create-displayname-input"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  System Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  data-testid="create-role-select"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="motorist">Citizen Motorist (Public driver portal, live bay telemetry, favorites)</option>
                  <option value="operator">Station Operator (Monitor video, calibrate bays, manage parking)</option>
                  <option value="admin">Administrator (Full authority + User management)</option>
                </select>
              </div>

              {/* Active Status Toggle for New User */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
                  <span className="text-[11px] text-slate-500">
                    {createForm.is_active ? 'Active — Allow immediate sign in' : 'Deactivated — User cannot log in until activated'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                    data-testid="create-active-checkbox"
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@kcca.go.ug"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+256 700 000000"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  data-testid="create-submit-btn"
                >
                  <Icon name={submitting ? 'sync' : 'person_add'} size={18} className={submitting ? 'animate-spin' : ''} />
                  <span>{submitting ? 'Creating User…' : 'Create Account'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT USER & RESET PASSWORD
          ========================================================================= */}
      {editingUser && (
        <div
          data-testid="edit-user-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#151f30] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Icon name="edit" size={20} />
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-black text-slate-900 dark:text-white">
                    Edit Account: @{editingUser.username}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update profile metadata or set a new password
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                <Icon name="error" size={16} className="text-red-500 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  placeholder="e.g. Samuel Mugisha"
                  data-testid="edit-displayname-input"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  System Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  data-testid="edit-role-select"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="motorist">Citizen Motorist (Public driver portal, live bay telemetry, favorites)</option>
                  <option value="operator">Station Operator (Station monitoring & bay configuration)</option>
                  <option value="admin">Administrator (Full privileges + User governance)</option>
                </select>
              </div>

              {/* Active Status Switch in Edit */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access (Status)</span>
                  <span className="text-[11px] text-slate-500">
                    {editForm.is_active
                      ? 'Active — Account can log in and access authorized portals.'
                      : 'Deactivated — Account is suspended and cannot log in.'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    disabled={editingUser?.username === auth?.username}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    data-testid="edit-active-checkbox"
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full peer transition-colors ${
                    editingUser?.username === auth?.username ? 'opacity-50 cursor-not-allowed' : ''
                  } bg-slate-200 dark:bg-slate-700 peer-checked:bg-emerald-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="user@kcca.go.ug"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+256 700 000000"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Icon name="lock_reset" size={16} />
                  <span>Reset Password (Optional)</span>
                </span>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to keep existing password"
                  data-testid="edit-password-input"
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  data-testid="edit-submit-btn"
                >
                  <Icon name={submitting ? 'sync' : 'save'} size={18} className={submitting ? 'animate-spin' : ''} />
                  <span>{submitting ? 'Saving Changes…' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRMATION MODAL: DELETE USER
          ========================================================================= */}
      {deleteConfirmUser && (
        <div
          data-testid="delete-confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmUser(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151f30] rounded-3xl border border-red-200 dark:border-red-900 shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Icon name="delete_forever" size={28} />
            </div>

            <div>
              <h3 className="font-headline-sm text-base font-black text-slate-900 dark:text-white">
                Delete Account @{deleteConfirmUser.username}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This action is permanent and revokes all console credentials for{' '}
                <strong className="text-slate-900 dark:text-white">
                  {deleteConfirmUser.display_name || deleteConfirmUser.username}
                </strong>
                .
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={submitting}
                onClick={handleDeleteSubmit}
                data-testid="confirm-delete-btn"
              >
                <Icon name={submitting ? 'sync' : 'delete'} size={18} className={submitting ? 'animate-spin' : ''} />
                <span>{submitting ? 'Deleting…' : 'Yes, Delete Account'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
