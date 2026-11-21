import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function PaymentsHistoryPage({ auth, areas = [] }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState({ total_collected_ugx: 0, active_passes: 0, total_transactions: 0 })
  const [plateQuery, setPlateQuery] = useState('')
  const [plateCheck, setPlateCheck] = useState(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)

  const isStaff = auth?.role === 'admin' || auth?.role === 'operator'

  const fetchPayments = async (plate = '') => {
    if (!auth?.token) return
    setLoading(true)
    try {
      const qs = plate ? `?plate=${encodeURIComponent(plate)}` : ''
      const res = await fetch(`${API_URL}/payments${qs}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setSummary(data.summary || { total_collected_ugx: 0, active_passes: 0, total_transactions: 0 })
        setPlateCheck(data.plate_check || null)
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Flutterwave redirect callback (?tx_ref=...&transaction_id=...&status=...)
  useEffect(() => {
    const txRef = searchParams.get('tx_ref')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')

    if (txRef && auth?.token) {
      fetch(`${API_URL}/payments/${txRef}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          sandbox_outcome: status === 'successful' ? 'successful' : 'failed',
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'PAID') {
            setBanner({ type: 'success', text: `Payment verified! Receipt ${data.payment?.receipt_no} issued.` })
          } else {
            setBanner({ type: 'error', text: 'Payment was not completed or was declined.' })
          }
          setSearchParams({})
          fetchPayments()
        })
        .catch(() => fetchPayments())
    } else {
      fetchPayments()
    }
  }, [auth?.token])

  const handlePlateLookup = (e) => {
    e.preventDefault()
    fetchPayments(plateQuery)
  }

  const nowSec = Math.floor(Date.now() / 1000)

  return (
    <div className="flex flex-col gap-space-lg" data-testid="payments-history-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
            {isStaff ? 'Payments & Plate Enforcement' : 'My Parking Passes & Payments'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {isStaff
              ? 'Verify active parking passes by vehicle plate and review collected test revenue.'
              : 'View your active digital parking passes, expiry times, and payment receipts.'}
          </p>
        </div>

        {areas.length > 0 && (
          <Button onClick={() => navigate(`/dashboard/pay/${areas[0].id}`)} data-testid="new-payment-btn">
            <Icon name="credit_card" size={18} />
            <span>Pay for Parking</span>
          </Button>
        )}
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <Icon name={banner.type === 'success' ? 'check_circle' : 'error'} size={18} />
          <span>{banner.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {isStaff ? 'Total Collected (Test)' : 'Total Paid (Test)'}
          </span>
          <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            UGX {Number(summary.total_collected_ugx || 0).toLocaleString()}
          </span>
        </div>

        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Valid Passes
          </span>
          <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summary.active_passes}
          </span>
        </div>

        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Transactions
          </span>
          <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {summary.total_transactions}
          </span>
        </div>
      </div>

      {/* Warden / Operator Plate Enforcement Lookup */}
      {isStaff && (
        <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Plate Enforcement Check
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter a vehicle plate number to check whether it has a valid pass, overstay balance, or is unpaid.
            </p>
          </div>

          <form onSubmit={handlePlateLookup} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Enter plate number (e.g. UBA 123X)..."
              data-testid="plate-lookup-input"
              className="flex-1 max-w-sm h-10 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase text-sm focus:outline-none focus:border-emerald-600"
            />
            <Button type="submit" size="sm" data-testid="plate-lookup-btn">
              <Icon name="search" size={16} />
              <span>Check Plate</span>
            </Button>
            {plateCheck && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPlateQuery('')
                  fetchPayments('')
                }}
              >
                Clear
              </Button>
            )}
          </form>

          {plateCheck && (
            <div
              data-testid="plate-check-result"
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                plateCheck.enforcement_status === 'VALID'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : plateCheck.enforcement_status === 'OVERSTAY'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div>
                <span className="font-mono font-bold text-sm">{plateCheck.plate_number}</span>
                <span className="mx-2">·</span>
                <span className="font-bold text-xs uppercase tracking-wider">
                  {plateCheck.enforcement_status}
                </span>
                {plateCheck.enforcement_status === 'VALID' && (
                  <p className="text-xs mt-1">
                    Valid at {plateCheck.latest_pass?.area_name} ({plateCheck.remaining_minutes} mins remaining).
                  </p>
                )}
                {plateCheck.enforcement_status === 'OVERSTAY' && (
                  <p className="text-xs mt-1">
                    Overstayed by {plateCheck.overstay_minutes} mins. Balance due: UGX{' '}
                    {Number(plateCheck.overstay_fee_ugx).toLocaleString()}.
                  </p>
                )}
                {plateCheck.enforcement_status === 'UNPAID' && (
                  <p className="text-xs mt-1">No active paid parking pass found for this plate.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading payment records...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center gap-2">
            <Icon name="credit_card" size={32} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No payment transactions yet</p>
            <p className="text-xs text-slate-500">Test parking payments will appear here once initiated.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs sm:text-sm" data-testid="payments-table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#273549] bg-slate-50 dark:bg-[#0c1220] text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Receipt / Ref</th>
                <th className="py-3 px-4 font-semibold">Plate</th>
                <th className="py-3 px-4 font-semibold">Facility</th>
                <th className="py-3 px-4 font-semibold">Method</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Pass Expiry</th>
                <th className="py-3 px-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1e2a3d]">
              {payments.map((p) => {
                const isPaid = p.status === 'PAID'
                const isExpired = isPaid && (p.expires_at || 0) <= nowSec
                return (
                  <tr key={p.tx_ref} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">{p.receipt_no || '—'}</div>
                      <div className="text-[10px] text-slate-400">{p.tx_ref}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {p.plate_number}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{p.area_name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{p.network}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                      UGX {Number(p.amount_ugx).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          !isPaid
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : isExpired
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {!isPaid ? p.status : isExpired ? 'EXPIRED' : 'ACTIVE PASS'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                      {p.expires_at
                        ? new Date(p.expires_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/payments/${p.tx_ref}`)}
                        data-testid={`view-receipt-${p.tx_ref}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
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
