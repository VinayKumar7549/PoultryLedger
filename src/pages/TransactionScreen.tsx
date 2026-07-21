import { useState } from 'react'
import { Customer, PaymentMethod, Transaction } from '../types'
import { today, getTime, uid } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { IconBack } from '../components/common/Icons'

export function TransactionScreen({
  customer,
  onBack,
  onSave,
}: {
  customer: Customer
  onBack: () => void
  onSave: (tx: Transaction, updatedOutstanding: number) => void
}) {
  const [numEggs, setNumEggs] = useState('')
  const [ratePer100, setRatePer100] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [savedMsg, setSavedMsg] = useState('')

  const eggsCount = parseInt(numEggs) || 0
  const rate = parseFloat(ratePer100) || 0
  const calculatedAmount = (eggsCount * rate) / 100
  const paid = parseFloat(amountPaid) || 0

  const creditKeptToday = Math.max(0, calculatedAmount - paid)
  const creditReducedToday = Math.max(0, paid - calculatedAmount)
  const creditChange = creditReducedToday - creditKeptToday
  const newOutstanding = Math.max(0, customer.outstandingCredit - creditChange)

  const handleSave = () => {
    if (eggsCount <= 0 || rate <= 0) return

    const traysEquivalent = eggsCount / 30

    const tx: Transaction = {
      id: 't' + uid(),
      customerId: customer.id,
      date: today,
      time: getTime(),
      trays: traysEquivalent,
      amountToBePaid: calculatedAmount,
      amountPaid: paid,
      paymentMethod,
      creditKeptToday,
      creditChange,
    }

    onSave(tx, newOutstanding)
    setSavedMsg('Saved successfully!')
    setTimeout(() => {
      setSavedMsg('')
      onBack()
    }, 1200)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
          <IconBack />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-800 truncate" style={{ fontWeight: 800, color: '#111827' }}>{customer.name}</h2>
          <p className="text-xs truncate" style={{ color: '#6b7280' }}>{customer.subtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Outstanding credit badge */}
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{
            background: customer.outstandingCredit > 0 ? '#fff5f5' : '#f0fdf4',
            border: '1.5px solid',
            borderColor: customer.outstandingCredit > 0 ? '#fecaca' : '#bbf7d0',
          }}
        >
          <div>
            <p className="text-xs font-600" style={{ color: customer.outstandingCredit > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>
              Current Outstanding Credit
            </p>
            <p className="text-xl font-800 mt-0.5" style={{ fontWeight: 800, color: customer.outstandingCredit > 0 ? '#dc2626' : '#059669' }}>
              {fmtCurrency(customer.outstandingCredit)}
            </p>
          </div>
          <span
            className="text-xs font-700 px-3 py-1 rounded-full"
            style={{
              background: customer.outstandingCredit > 0 ? '#fee2e2' : '#d1fae5',
              color: customer.outstandingCredit > 0 ? '#dc2626' : '#065f46',
              fontWeight: 700,
            }}
          >
            {customer.outstandingCredit > 0 ? 'Pending' : 'Clear'}
          </span>
        </div>

        {/* ── Today's Sale Card ── */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
          <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>Today's Sale</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Number of Eggs */}
            <div>
              <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Number of Eggs</label>
              <input
                type="number"
                value={numEggs}
                onChange={e => setNumEggs(e.target.value)}
                placeholder="e.g. 90"
                className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
                style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
              />
            </div>

            {/* Rate per 100 Eggs */}
            <div>
              <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Rate per 100 Eggs (₹)</label>
              <input
                type="number"
                value={ratePer100}
                onChange={e => setRatePer100(e.target.value)}
                placeholder="e.g. 225"
                className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
                style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Amount To Pay Calculation Banner */}
          <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-600" style={{ color: '#065f46', fontWeight: 600 }}>Amount to Pay</span>
              <span className="text-xl font-800" style={{ fontWeight: 800, color: '#059669' }}>
                {fmtCurrency(calculatedAmount)}
              </span>
            </div>
            {eggsCount > 0 && rate > 0 && (
              <p className="text-xs font-600 mt-0.5" style={{ color: '#047857', fontWeight: 600 }}>
                {eggsCount} eggs × ₹{rate} / 100 = {fmtCurrency(calculatedAmount)}
              </p>
            )}
          </div>
        </div>

        {/* ── Payment Received Card ── */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
          <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>Payment Received</p>

          <div>
            <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Amount Paid (₹)</label>
            <input
              type="number"
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder="e.g. 200"
              className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Payment Method Toggle */}
          <div>
            <label className="text-xs font-600 mb-1.5 block" style={{ color: '#6b7280', fontWeight: 600 }}>Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className="py-3 rounded-xl text-sm font-700 transition-all border"
                style={{
                  background: paymentMethod === 'cash' ? '#059669' : 'white',
                  color: paymentMethod === 'cash' ? 'white' : '#374151',
                  borderColor: paymentMethod === 'cash' ? '#059669' : '#e5e7eb',
                  fontWeight: 700,
                }}
              >
                💵 Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('gpay')}
                className="py-3 rounded-xl text-sm font-700 transition-all border"
                style={{
                  background: paymentMethod === 'gpay' ? '#059669' : 'white',
                  color: paymentMethod === 'gpay' ? 'white' : '#374151',
                  borderColor: paymentMethod === 'gpay' ? '#059669' : '#e5e7eb',
                  fontWeight: 700,
                }}
              >
                📱 GPay
              </button>
            </div>
          </div>
        </div>

        {/* ── Updated Outstanding Credit Preview ── */}
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#f3f4f6' }}>
          <div>
            <p className="text-xs font-600" style={{ color: '#6b7280', fontWeight: 600 }}>New Outstanding Credit</p>
            <p className="text-lg font-800 mt-0.5" style={{ fontWeight: 800, color: newOutstanding > 0 ? '#dc2626' : '#059669' }}>
              {fmtCurrency(newOutstanding)}
            </p>
          </div>
          {creditKeptToday > 0 && (
            <span className="text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
              +{fmtCurrency(creditKeptToday)} credit added
            </span>
          )}
          {creditReducedToday > 0 && (
            <span className="text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>
              -{fmtCurrency(creditReducedToday)} credit reduced
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={eggsCount <= 0 || rate <= 0}
          className="w-full py-4 rounded-2xl text-base font-800 active:scale-98 transition-all shadow-lg mt-2"
          style={{
            background: eggsCount > 0 && rate > 0 ? '#059669' : '#9ca3af',
            color: 'white',
            fontWeight: 800,
          }}
        >
          {savedMsg ? '✓ ' + savedMsg : 'Save Transaction'}
        </button>
      </div>
    </div>
  )
}
