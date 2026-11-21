import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, Button } from './ui'

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8001'
    : 'https://kcca-parkwatch.onrender.com')

function parseRate(rateStr) {
  const digits = String(rateStr || '').replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 2000
}

export default function PayParkingPage({ areas = [], auth }) {
  const { areaId } = useParams()
  const navigate = useNavigate()

  const selectedArea = useMemo(() => {
    if (areaId) return areas.find((a) => String(a.id) === String(areaId)) || areas[0] || null
    return areas[0] || null
  }, [areas, areaId])

  const [chosenAreaId, setChosenAreaId] = useState(() => selectedArea?.id || '')
  const activeArea = useMemo(
    () => areas.find((a) => String(a.id) === String(chosenAreaId || selectedArea?.id)) || selectedArea,
    [areas, chosenAreaId, selectedArea]
  )

  const [payerName, setPayerName] = useState(() => auth?.displayName || auth?.username || '')
  const [plateNumber, setPlateNumber] = useState('')
  const [hours, setHours] = useState(2)
  const [network, setNetwork] = useState('MTN')
  const [phoneNumber, setPhoneNumber] = useState('+256 770 000000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Sandbox prompt / Receipt state
  const [pendingTx, setPendingTx] = useState(null)
  const [receipt, setReceipt] = useState(null)

  const hourlyRateNum = parseRate(activeArea?.hourlyRate)
  const totalUgx = hourlyRateNum * hours

  const handleInitiate = async (e) => {
    e.preventDefault()
    setError('')
    if (!activeArea) {
      setError('Please select a parking facility.')
      return
    }
    if (plateNumber.trim().length < 3) {
      setError('Please enter a valid vehicle plate number (e.g. UBA 123X).')
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`${API_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          area_id: activeArea.id,
          payer_name: payerName.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          hours,
          network,
          phone_number: phoneNumber.trim(),
          redirect_url: `${window.location.origin}/dashboard/payments`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to initiate test payment.')
        return
      }

      if (data.mode === 'flutterwave' && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      // Local Flutterwave-compatible Sandbox Mode
      setPendingTx(data.payment)
    } catch {
      setError('Network error communicating with payment service.')
    } finally {
      setBusy(false)
    }
  }

  const handleSandboxOutcome = async (outcome) => {
    if (!pendingTx) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/payments/${pendingTx.tx_ref}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ sandbox_outcome: outcome }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Verification failed.')
        return
      }
      if (data.status === 'PAID') {
        setReceipt(data.payment)
        setPendingTx(null)
      } else {
        setError('Test payment was declined in sandbox mode. You can try again.')
        setPendingTx(null)
      }
    } catch {
      setError('Failed to verify sandbox payment.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full h-11 px-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'

  if (receipt) {
    return (
      <div className="flex flex-col gap-space-lg max-w-2xl" data-testid="payment-receipt-view">
        <div className="bg-white dark:bg-[#151f30] border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-xs p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <Icon name="check_circle" size={24} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Test Payment Confirmed
                </span>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Digital Parking Pass Issued
                </h1>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold">
              {receipt.receipt_no}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Facility</span>
              <span className="font-bold text-slate-900 dark:text-white">{receipt.area_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Vehicle Plate</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{receipt.plate_number}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Duration</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{receipt.hours} hours</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Amount Paid (Test)</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                UGX {Number(receipt.amount_ugx).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Valid Until</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {new Date(receipt.expires_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Reference</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{receipt.tx_ref}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 print:hidden">
            <Button variant="secondary" onClick={() => navigate(`/dashboard/payments/${receipt.tx_ref}`)}>
              View / Print Receipt
            </Button>
            <Button onClick={() => navigate('/dashboard/payments')}>
              View All Payments
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl" data-testid="pay-parking-page">
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Flutterwave Test Mode · UGX
          </span>
          <h1 className="font-headline-lg text-2xl sm:text-3xl text-slate-900 dark:text-white font-bold tracking-tight">
            Pay for Parking Pass
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm font-medium flex items-center gap-2">
          <Icon name="error" size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pendingTx ? (
        <div className="bg-white dark:bg-[#151f30] border border-amber-300 dark:border-amber-700 rounded-xl shadow-xs p-6 flex flex-col gap-5" data-testid="sandbox-prompt">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Local Sandbox Simulator
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                Confirm Test {pendingTx.network} Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Simulating Flutterwave checkout for <strong>{pendingTx.plate_number}</strong> at{' '}
                <strong>{pendingTx.area_name}</strong>.
              </p>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-xs text-slate-400 block">Amount Due</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                UGX {Number(pendingTx.amount_ugx).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            In production or when <code className="font-mono">FLW_SECRET_KEY</code> (<code className="font-mono">FLWSECK_TEST-...</code>) is configured on the backend, this step redirects to Flutterwave&apos;s hosted checkout for MTN/Airtel Mobile Money &amp; Test Cards.
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => handleSandboxOutcome('failed')}
              data-testid="sandbox-decline-btn"
            >
              Simulate Decline
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => handleSandboxOutcome('successful')}
              data-testid="sandbox-approve-btn"
            >
              <Icon name="check_circle" size={18} />
              <span>{busy ? 'Verifying...' : 'Approve Test Payment'}</span>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInitiate} className="bg-white dark:bg-[#151f30] border border-slate-200 dark:border-[#273549] rounded-xl shadow-xs p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Parking Facility
              </label>
              <select
                value={activeArea?.id || ''}
                onChange={(e) => setChosenAreaId(e.target.value)}
                className={inputClass}
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.hourlyRate || 'UGX 2,000 / hr'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payer Name *
              </label>
              <input
                type="text"
                required
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. Jane Nakato"
                data-testid="pay-payer-name-input"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                required
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="e.g. UBA 123X"
                data-testid="pay-plate-input"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Duration (Hours)
              </label>
              <select
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value, 10))}
                data-testid="pay-hours-select"
                className={inputClass}
              >
                {[1, 2, 3, 4, 6, 8, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? 'hour' : 'hours'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Method (Test)
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className={inputClass}
              >
                <option value="MTN">MTN Mobile Money (Uganda)</option>
                <option value="AIRTEL">Airtel Money (Uganda)</option>
                <option value="CARD">Test Card (Visa / Mastercard)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Number (for MoMo / Receipt)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+256 770 000000"
                className={inputClass}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Rate: UGX {hourlyRateNum.toLocaleString()} / hr × {hours} {hours === 1 ? 'hr' : 'hrs'}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Enforcement hours: Mon–Sat 07:00–19:00
              </span>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-[11px] font-semibold uppercase text-slate-400 block">Total</span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                UGX {totalUgx.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} data-testid="pay-submit-btn">
              <Icon name="credit_card" size={18} />
              <span>{busy ? 'Initiating...' : `Pay UGX ${totalUgx.toLocaleString()} (Test)`}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
