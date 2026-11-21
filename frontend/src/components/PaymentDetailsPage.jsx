import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

export default function PaymentDetailsPage({ auth }) {
  const { txRef } = useParams()
  const navigate = useNavigate()
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth?.token || !txRef) return
    setLoading(true)
    setError('')
    fetch(`${API_URL}/payments/${encodeURIComponent(txRef)}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Failed to load payment receipt')
        setPayment(data.payment)
      })
      .catch((err) => setError(err.message || 'Error loading receipt'))
      .finally(() => setLoading(false))
  }, [auth?.token, txRef])

  if (loading) {
    return (
      <div className="p-10 text-center text-xs text-slate-500">
        Loading payment receipt...
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="max-w-xl bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl p-8 text-center flex flex-col items-center gap-3">
        <Icon name="error" size={32} className="text-red-500" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Receipt Unavailable</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Payment record not found.'}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    )
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const isPaid = payment.status === 'PAID'
  const isExpired = isPaid && (payment.expires_at || 0) <= nowSec
  const statusLabel = !isPaid ? payment.status : isExpired ? 'EXPIRED' : 'ACTIVE PASS'

  return (
    <div className="flex flex-col gap-space-lg max-w-2xl" data-testid="payment-details-page">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
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
            <h1 className="font-headline-lg text-2xl text-slate-900 dark:text-white font-bold tracking-tight">
              Payment Receipt &amp; Details
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{payment.tx_ref}</p>
          </div>
        </div>

        <Button onClick={() => window.print()} data-testid="print-receipt-btn">
          <Icon name="upload_file" size={18} />
          <span>Print / Save PDF</span>
        </Button>
      </div>

      {/* Printable Official KCCA Receipt Card */}
      <div className="bg-white dark:bg-[#151f30] print:bg-white print:text-black border border-slate-200 dark:border-[#273549] print:border-slate-300 rounded-xl shadow-xs print:shadow-none overflow-hidden">
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-emerald-700" />
          <div className="w-1/3 bg-amber-500" />
          <div className="w-1/3 bg-red-600" />
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                <img src="/logo.jpg" alt="KCCA Logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white print:text-black block">
                  KCCA ParkWatch
                </span>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Official Parking Payment Receipt
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                  !isPaid
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isExpired
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {statusLabel}
              </span>
              {payment.receipt_no && (
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white print:text-black mt-1.5">
                  {payment.receipt_no}
                </div>
              )}
            </div>
          </div>

          {/* Amount Highlight */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Total Amount ({payment.mode === 'flutterwave' ? 'Flutterwave Test' : 'Sandbox Test'})</span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 print:text-black tabular-nums">
                UGX {Number(payment.amount_ugx || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Vehicle Plate</span>
              <span className="text-lg font-mono font-extrabold text-slate-900 dark:text-white print:text-black">
                {payment.plate_number}
              </span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Parking Facility</span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black">{payment.area_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Duration &amp; Rate</span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black tabular-nums">
                {payment.hours} {payment.hours === 1 ? 'hr' : 'hrs'} @ UGX {Number(payment.hourly_rate_ugx || 0).toLocaleString()} / hr
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Payer Name</span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                {payment.display_name || payment.username} (@{payment.username})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Payment Method &amp; Phone</span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black">
                {payment.network} · {payment.phone_number || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Paid At</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black tabular-nums">
                {payment.paid_at ? new Date(payment.paid_at * 1000).toLocaleString() : 'Not completed'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Valid Until</span>
              <span className="font-semibold text-slate-900 dark:text-white print:text-black tabular-nums">
                {payment.expires_at ? new Date(payment.expires_at * 1000).toLocaleString() : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Transaction Reference</span>
              <span className="font-mono text-xs text-slate-700 dark:text-slate-300 print:text-black">{payment.tx_ref}</span>
            </div>
            {payment.flw_transaction_id && (
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-semibold">Flutterwave ID</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 print:text-black">{payment.flw_transaction_id}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>Kampala Capital City Authority (KCCA) · Enforcement: Mon–Sat 07:00–19:00</span>
            <span>Generated by KCCA ParkWatch</span>
          </div>
        </div>
      </div>
    </div>
  )
}
