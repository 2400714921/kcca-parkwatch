import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function WardenVerifyPage({ auth, areas = [] }) {
  const navigate = useNavigate()
  const [plateQuery, setPlateQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [plateCheck, setPlateCheck] = useState(null)
  const [plateTransactions, setPlateTransactions] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [summary, setSummary] = useState({ total_collected_ugx: 0, active_passes: 0, total_transactions: 0 })

  const assignedArea = areas[0] || null
  const assignedAreaName = auth?.assignedAreaName || assignedArea?.name || 'Assigned Parking Area'

  const fetchAreaData = async (plate = '') => {
    if (!auth?.token) return
    setLoading(true)
    try {
      const qs = plate ? `?plate=${encodeURIComponent(plate)}` : ''
      const res = await fetch(`${API_URL}/payments${qs}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary || { total_collected_ugx: 0, active_passes: 0, total_transactions: 0 })
        setRecentPayments(data.payments || [])
        setPlateCheck(data.plate_check || null)
        setPlateTransactions(data.plate_transactions || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAreaData()
  }, [auth?.token])

  const handleVerify = (e) => {
    e.preventDefault()
    if (!plateQuery.trim()) return
    fetchAreaData(plateQuery.trim())
  }

  const nowSec = Math.floor(Date.now() / 1000)

  return (
    <div className="flex flex-col gap-space-lg" data-testid="warden-verify-page">
      {/* Assigned Parking Area Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Parking Attendant · Assigned Location
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
            {assignedAreaName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Enter a vehicle number plate to verify payment status and view its transaction profile for this parking area.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Active Passes</span>
            <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {summary.active_passes}
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] text-right">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">Area Transactions</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {summary.total_transactions}
            </span>
          </div>
        </div>
      </div>

      {/* Plate Lookup Form */}
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Verify Vehicle Number Plate
        </h2>
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={plateQuery}
            onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
            placeholder="Enter number plate (e.g. UBA 777T)..."
            data-testid="warden-plate-input"
            className="flex-1 max-w-md h-11 px-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase text-sm focus:outline-none focus:border-emerald-600"
          />
          <Button type="submit" disabled={loading} data-testid="warden-verify-btn">
            <Icon name="search" size={18} />
            <span>{loading ? 'Checking...' : 'Check Transaction Profile'}</span>
          </Button>
          {plateCheck && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPlateQuery('')
                setPlateCheck(null)
                setPlateTransactions([])
              }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Transaction Profile Result */}
        {plateCheck && (
          <div className="mt-2 flex flex-col gap-4" data-testid="warden-transaction-profile">
            <div
              className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                plateCheck.enforcement_status === 'VALID'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : plateCheck.enforcement_status === 'OVERSTAY'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-lg">{plateCheck.plate_number}</span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-white/70 dark:bg-black/30">
                    {plateCheck.enforcement_status}
                  </span>
                </div>
                {plateCheck.enforcement_status === 'VALID' && (
                  <p className="text-xs sm:text-sm mt-1">
                    Paid pass active at <strong>{assignedAreaName}</strong> ({plateCheck.remaining_minutes} mins remaining).
                  </p>
                )}
                {plateCheck.enforcement_status === 'OVERSTAY' && (
                  <p className="text-xs sm:text-sm mt-1">
                    Overstayed by {plateCheck.overstay_minutes} mins. Balance due:{' '}
                    <strong>UGX {Number(plateCheck.overstay_fee_ugx).toLocaleString()}</strong>.
                  </p>
                )}
                {plateCheck.enforcement_status === 'UNPAID' && (
                  <p className="text-xs sm:text-sm mt-1">
                    No paid parking pass found for <strong>{plateCheck.plate_number}</strong> at{' '}
                    <strong>{assignedAreaName}</strong>.
                  </p>
                )}
              </div>

              {plateCheck.latest_pass && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/dashboard/payments/${plateCheck.latest_pass.tx_ref}`)}
                >
                  View / Print Receipt
                </Button>
              )}
            </div>

            {/* Payer & Latest Pass Profile Details */}
            {plateCheck.latest_pass && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Driver / Payer</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {plateCheck.latest_pass.display_name || plateCheck.latest_pass.username}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone Number</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {plateCheck.latest_pass.phone_number || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Latest Receipt</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {plateCheck.latest_pass.receipt_no || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Valid Until</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {plateCheck.latest_pass.expires_at
                      ? new Date(plateCheck.latest_pass.expires_at * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Full Transaction History for this Plate at Assigned Area */}
            {plateTransactions.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500">
                      <th className="py-2.5 px-3 font-semibold">Receipt / Ref</th>
                      <th className="py-2.5 px-3 font-semibold">Amount</th>
                      <th className="py-2.5 px-3 font-semibold">Method</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {plateTransactions.map((tx) => {
                      const isExpired = tx.status === 'PAID' && (tx.expires_at || 0) <= nowSec
                      return (
                        <tr key={tx.tx_ref}>
                          <td className="py-2.5 px-3 font-mono">{tx.receipt_no || tx.tx_ref}</td>
                          <td className="py-2.5 px-3 font-bold tabular-nums">
                            UGX {Number(tx.amount_ugx).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">{tx.network}</td>
                          <td className="py-2.5 px-3 font-semibold">
                            {tx.status !== 'PAID' ? tx.status : isExpired ? 'EXPIRED' : 'ACTIVE PASS'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/payments/${tx.tx_ref}`)}
                              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                            >
                              View / Print
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Area Transactions */}
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Recent Transactions at {assignedAreaName}
          </h2>
        </div>
        {recentPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No transactions recorded for this parking area yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#273549] bg-slate-50 dark:bg-[#0c1220] text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Plate</th>
                <th className="py-3 px-4 font-semibold">Driver</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3d]">
              {recentPayments.slice(0, 10).map((p) => {
                const isExpired = p.status === 'PAID' && (p.expires_at || 0) <= nowSec
                return (
                  <tr key={p.tx_ref} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.plate_number}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{p.display_name || p.username}</td>
                    <td className="py-3 px-4 font-bold tabular-nums">UGX {Number(p.amount_ugx).toLocaleString()}</td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      {p.status !== 'PAID' ? p.status : isExpired ? 'EXPIRED' : 'ACTIVE PASS'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/payments/${p.tx_ref}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        Details / Print
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
