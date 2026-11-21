import React, { useState, useEffect } from 'react'
import { Icon, Button, EmptyState } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function AttendantManagementPage({ auth, areas = [] }) {
  const [attendants, setAttendants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [activeView, setActiveView] = useState('list') // 'list' | 'create' | 'edit'
  const [editingAttendant, setEditingAttendant] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [formError, setFormError] = useState('')

  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    display_name: '',
    email: '',
    phone: '',
    assigned_area_id: '',
  })

  const [editForm, setEditForm] = useState({
    display_name: '',
    email: '',
    phone: '',
    assigned_area_id: '',
    is_active: true,
    password: '',
  })

  const fetchAttendants = async () => {
    if (!auth?.token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/attendants`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAttendants(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendants()
  }, [auth?.token])

  const openCreate = () => {
    setCreateForm({
      username: '',
      password: '',
      display_name: '',
      email: '',
      phone: '',
      assigned_area_id: areas[0]?.id ? String(areas[0].id) : '',
    })
    setFormError('')
    setActiveView('create')
  }

  const openEdit = (att) => {
    setEditingAttendant(att)
    setEditForm({
      display_name: att.display_name || att.username,
      email: att.email || '',
      phone: att.phone || '',
      assigned_area_id: att.assigned_area_id ? String(att.assigned_area_id) : '',
      is_active: att.is_active !== false,
      password: '',
    })
    setFormError('')
    setActiveView('edit')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    const cleanEmail = (createForm.email || '').trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Please enter a valid email address for the attendant.')
      return
    }
    if (!createForm.assigned_area_id) {
      setFormError('Please select one of your parking facilities.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/attendants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.detail || 'Failed to assign Parking Attendant')
        return
      }
      setFeedback({ type: 'success', text: `Assigned @${data.attendant.username} to ${data.attendant.assigned_area_name}.` })
      setActiveView('list')
      fetchAttendants()
    } catch {
      setFormError('Network error communicating with backend.')
    } finally {
      setBusy(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editingAttendant) return
    setFormError('')
    setBusy(true)
    try {
      const payload = {
        display_name: editForm.display_name,
        email: editForm.email,
        phone: editForm.phone,
        assigned_area_id: editForm.assigned_area_id,
        is_active: editForm.is_active,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }
      const res = await fetch(`${API_URL}/attendants/${editingAttendant.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.detail || 'Failed to update Parking Attendant')
        return
      }
      setFeedback({ type: 'success', text: `Updated @${editingAttendant.username}.` })
      setActiveView('list')
      setEditingAttendant(null)
      fetchAttendants()
    } catch {
      setFormError('Network error updating Parking Attendant.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleActive = async (att) => {
    const next = att.is_active === false
    const res = await fetch(`${API_URL}/attendants/${att.username}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ is_active: next }),
    })
    if (res.ok) {
      setAttendants((prev) =>
        prev.map((a) => (a.username === att.username ? { ...a, is_active: next } : a))
      )
    }
  }

  const handleDelete = async (att) => {
    if (!window.confirm(`Remove Parking Attendant @${att.username}?`)) return
    const res = await fetch(`${API_URL}/attendants/${att.username}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) {
      setAttendants((prev) => prev.filter((a) => a.username !== att.username))
      setFeedback({ type: 'success', text: `Removed @${att.username}.` })
    }
  }

  const inputClass =
    'w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-600'

  if (activeView === 'create') {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="attendant-create-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl font-bold text-slate-900 dark:text-white">
              Assign Parking Attendant
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create an attendant account for one of your parking facilities.
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
            {formError}
          </div>
        )}

        <form onSubmit={handleCreate} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username *</label>
              <input
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="e.g. attendant_john"
                data-testid="attendant-username-input"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password *</label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min 6 characters"
                data-testid="attendant-password-input"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={createForm.display_name}
                onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                placeholder="e.g. John Mukasa"
                data-testid="attendant-name-input"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="e.g. attendant@kcca.go.ug"
                data-testid="attendant-email-input"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+256 700 000000"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Parking Facility *
              </label>
              <select
                required
                value={createForm.assigned_area_id}
                onChange={(e) => setCreateForm({ ...createForm, assigned_area_id: e.target.value })}
                data-testid="attendant-area-select"
                className={inputClass}
              >
                <option value="">Select a facility...</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} data-testid="attendant-submit-btn">
              <Icon name="person_add" size={18} />
              <span>{busy ? 'Assigning...' : 'Assign Attendant'}</span>
            </Button>
          </div>
        </form>
      </div>
    )
  }

  if (activeView === 'edit' && editingAttendant) {
    return (
      <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="attendant-edit-page">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('list')}
            className="h-10 w-10 rounded-lg bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <Icon name="arrow_back" size={18} />
          </button>
          <div>
            <h1 className="font-headline-lg text-2xl font-bold text-slate-900 dark:text-white">
              Edit Attendant: @{editingAttendant.username}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update details, reassign facility, or reset password.
            </p>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
            {formError}
          </div>
        )}

        <form onSubmit={handleEdit} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="e.g. attendant@kcca.go.ug"
                data-testid="attendant-edit-email-input"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Parking Facility
              </label>
              <select
                value={editForm.assigned_area_id}
                onChange={(e) => setEditForm({ ...editForm, assigned_area_id: e.target.value })}
                className={inputClass}
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reset Password (Optional)
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep existing"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setActiveView('list')}>
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

  const filtered = attendants.filter((a) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesQ =
      !q ||
      (a.username || '').toLowerCase().includes(q) ||
      (a.display_name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    const matchesArea = areaFilter === 'all' || String(a.assigned_area_id) === String(areaFilter)
    return matchesQ && matchesArea
  })

  const activeCount = attendants.filter((a) => a.is_active !== false).length

  return (
    <div className="flex flex-col gap-space-lg" data-testid="attendants-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
            My Parking Attendants
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Assign and manage Parking Attendants for the parking facilities you own.
          </p>
        </div>

        <Button onClick={openCreate} disabled={areas.length === 0} data-testid="add-attendant-btn">
          <Icon name="person_add" size={18} />
          <span>Assign Attendant</span>
        </Button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
          {feedback.text}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Attendants</span>
          <span className="block text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {attendants.length}
          </span>
        </div>
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active</span>
          <span className="block text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {activeCount}
          </span>
        </div>
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owned Facilities</span>
          <span className="block text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {areas.length}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attendants..."
            className="h-10 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm flex-1 max-w-xs focus:outline-none focus:border-emerald-600"
          />
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-emerald-600"
          >
            <option value="all">All Owned Facilities</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-0.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
              viewMode === 'grid' ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon name="grid_view" size={14} />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
              viewMode === 'table' ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon name="table_rows" size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">Loading attendants...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Parking Attendants assigned"
          body={
            areas.length === 0
              ? 'Register or get assigned a parking facility first, then assign Parking Attendants.'
              : 'Assign a Parking Attendant to verify vehicle plates at your parking facility.'
          }
          action={
            areas.length > 0 && (
              <Button onClick={openCreate}>
                <Icon name="person_add" size={18} />
                Assign First Attendant
              </Button>
            )
          }
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm" data-testid="attendants-table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#273549] bg-slate-50 dark:bg-[#0c1220] text-[11px] uppercase text-slate-500">
                <th className="py-3 px-4 font-semibold">Attendant</th>
                <th className="py-3 px-4 font-semibold">Assigned Facility</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3d]">
              {filtered.map((att) => (
                <tr key={att.username}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{att.display_name}</div>
                    <div className="text-[11px] font-mono text-slate-400">@{att.username}</div>
                    {att.email && <div className="text-[11px] text-slate-500 dark:text-slate-400">{att.email}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{att.assigned_area_name}</td>
                  <td className="py-3 px-4 text-slate-500">{att.phone || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      att.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {att.is_active !== false ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => handleToggleActive(att)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer" title="Toggle Active">
                        <Icon name={att.is_active !== false ? 'block' : 'check_circle'} size={15} />
                      </button>
                      <button onClick={() => openEdit(att)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer" title="Edit">
                        <Icon name="edit" size={15} />
                      </button>
                      <button onClick={() => handleDelete(att)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:text-red-600 cursor-pointer" title="Delete">
                        <Icon name="delete" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="attendants-grid">
          {filtered.map((att) => (
            <div key={att.username} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{att.display_name}</div>
                  <div className="text-xs font-mono text-slate-400">@{att.username}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  att.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {att.is_active !== false ? 'Active' : 'Deactivated'}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div><strong>Facility:</strong> {att.assigned_area_name}</div>
                <div className="mt-1 truncate"><strong>Email:</strong> {att.email || '—'}</div>
                <div className="mt-1"><strong>Phone:</strong> {att.phone || '—'}</div>
              </div>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => handleToggleActive(att)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer" title="Toggle Active">
                  <Icon name={att.is_active !== false ? 'block' : 'check_circle'} size={15} />
                </button>
                <button onClick={() => openEdit(att)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer" title="Edit">
                  <Icon name="edit" size={15} />
                </button>
                <button onClick={() => handleDelete(att)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:text-red-600 cursor-pointer" title="Delete">
                  <Icon name="delete" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
