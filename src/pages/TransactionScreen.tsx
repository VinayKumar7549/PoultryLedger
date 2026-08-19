import { useState, useEffect } from 'react'
import { Customer, PaymentMethod, Transaction, TransactionType, BusinessProfile } from '../types'
import { getTodayStr, getTime, uid } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { IconBack, IconHistory } from '../components/common/Icons'
import { businessProfileService } from '../services/businessProfileService'
import { PaymentQrCodeDisplay } from '../components/common/PaymentQrCodeDisplay'

export function TransactionScreen({
  customer,
  onBack,
  onSave,
  onOpenLedger,
  editingTx,
}: {
  customer: Customer
  onBack: () => void
  onSave: (tx: Transaction, updatedOutstanding: number) => void
  onOpenLedger?: () => void
  editingTx?: Transaction
}) {
  const [txType, setTxType] = useState<TransactionType>(editingTx?.type || 'sale')
  const [numEggs, setNumEggs] = useState(
    editingTx ? (editingTx.trays ? String(Math.round(editingTx.trays * 30)) : '') : ''
  )
  const [totalAmount, setTotalAmount] = useState(
    editingTx ? (editingTx.amountToBePaid ? String(editingTx.amountToBePaid) : '') : ''
  )
  const [ratePer100, setRatePer100] = useState(() => {
    if (!editingTx || !editingTx.trays || !editingTx.amountToBePaid) return ''
    const eggs = editingTx.trays * 30
    return eggs > 0 ? String(Number(((editingTx.amountToBePaid / eggs) * 100).toFixed(2))) : ''
  })
  const [amountPaid, setAmountPaid] = useState(
    editingTx ? (editingTx.amountPaid !== undefined ? String(editingTx.amountPaid) : '') : ''
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editingTx?.paymentMethod || 'cash')
  const [notes, setNotes] = useState(editingTx?.notes || '')
  const [savedMsg, setSavedMsg] = useState('')
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)

  useEffect(() => {
    businessProfileService.getProfile().then(setBusinessProfile)
  }, [])

  const [lastEdited, setLastEdited] = useState<'eggs' | 'rate' | 'total'>('eggs')
  const [secondLastEdited, setSecondLastEdited] = useState<'eggs' | 'rate' | 'total'>('rate')

  const eggsCount = parseFloat(numEggs) || 0
  const rate = parseFloat(ratePer100) || 0
  const calculatedAmount = parseFloat(totalAmount) || (eggsCount * rate) / 100
  const paid = parseFloat(amountPaid) || 0

  const handleEggsChange = (val: string) => {
    setNumEggs(val)
    const eggs = parseFloat(val) || 0
    const currentRate = parseFloat(ratePer100) || 0
    const currentTotal = parseFloat(totalAmount) || 0

    let prevLast = lastEdited
    let prevSecond = secondLastEdited
    if (prevLast !== 'eggs') {
      prevSecond = prevLast
      prevLast = 'eggs'
      setLastEdited('eggs')
      setSecondLastEdited(prevSecond)
    }

    if (eggs <= 0) return

    const partner = prevSecond
    if (partner === 'rate' && currentRate > 0) {
      const calcTotal = (eggs * currentRate) / 100
      setTotalAmount(calcTotal > 0 ? String(Number(calcTotal.toFixed(2))) : '')
    } else if (partner === 'total' && currentTotal > 0) {
      const calcRate = (currentTotal * 100) / eggs
      setRatePer100(calcRate > 0 ? String(Number(calcRate.toFixed(2))) : '')
    } else if (currentRate > 0) {
      const calcTotal = (eggs * currentRate) / 100
      setTotalAmount(calcTotal > 0 ? String(Number(calcTotal.toFixed(2))) : '')
    } else if (currentTotal > 0) {
      const calcRate = (currentTotal * 100) / eggs
      setRatePer100(calcRate > 0 ? String(Number(calcRate.toFixed(2))) : '')
    }
  }

  const handleRateChange = (val: string) => {
    setRatePer100(val)
    const eggs = parseFloat(numEggs) || 0
    const currentRate = parseFloat(val) || 0
    const currentTotal = parseFloat(totalAmount) || 0

    let prevLast = lastEdited
    let prevSecond = secondLastEdited
    if (prevLast !== 'rate') {
      prevSecond = prevLast
      prevLast = 'rate'
      setLastEdited('rate')
      setSecondLastEdited(prevSecond)
    }

    if (currentRate <= 0) return

    const partner = prevSecond
    if (partner === 'eggs' && eggs > 0) {
      const calcTotal = (eggs * currentRate) / 100
      setTotalAmount(calcTotal > 0 ? String(Number(calcTotal.toFixed(2))) : '')
    } else if (partner === 'total' && currentTotal > 0) {
      const calcEggs = (currentTotal * 100) / currentRate
      setNumEggs(calcEggs > 0 ? String(Number(calcEggs.toFixed(2))) : '')
    } else if (eggs > 0) {
      const calcTotal = (eggs * currentRate) / 100
      setTotalAmount(calcTotal > 0 ? String(Number(calcTotal.toFixed(2))) : '')
    } else if (currentTotal > 0) {
      const calcEggs = (currentTotal * 100) / currentRate
      setNumEggs(calcEggs > 0 ? String(Number(calcEggs.toFixed(2))) : '')
    }
  }

  const handleTotalChange = (val: string) => {
    setTotalAmount(val)
    const eggs = parseFloat(numEggs) || 0
    const currentRate = parseFloat(ratePer100) || 0
    const currentTotal = parseFloat(val) || 0

    let prevLast = lastEdited
    let prevSecond = secondLastEdited
    if (prevLast !== 'total') {
      prevSecond = prevLast
      prevLast = 'total'
      setLastEdited('total')
      setSecondLastEdited(prevSecond)
    }

    if (currentTotal <= 0) return

    const partner = prevSecond
    if (partner === 'eggs' && eggs > 0) {
      const calcRate = (currentTotal * 100) / eggs
      setRatePer100(calcRate > 0 ? String(Number(calcRate.toFixed(2))) : '')
    } else if (partner === 'rate' && currentRate > 0) {
      const calcEggs = (currentTotal * 100) / currentRate
      setNumEggs(calcEggs > 0 ? String(Number(calcEggs.toFixed(2))) : '')
    } else if (eggs > 0) {
      const calcRate = (currentTotal * 100) / eggs
      setRatePer100(calcRate > 0 ? String(Number(calcRate.toFixed(2))) : '')
    } else if (currentRate > 0) {
      const calcEggs = (currentTotal * 100) / currentRate
      setNumEggs(calcEggs > 0 ? String(Number(calcEggs.toFixed(2))) : '')
    }
  }

  const creditKeptToday = txType === 'sale' ? Math.max(0, calculatedAmount - paid) : 0
  const creditReducedToday = txType === 'sale' ? Math.max(0, paid - calculatedAmount) : paid
  const creditChange = creditReducedToday - creditKeptToday
  const newOutstanding = Math.max(0, customer.outstandingCredit - creditChange)

  const isFormValid = txType === 'sale' ? eggsCount > 0 && calculatedAmount > 0 : paid > 0

  const handleSave = () => {
    if (!isFormValid) return

    let tx: Transaction
    const txId = editingTx?.id || 't' + uid()
    const txDate = editingTx?.date || getTodayStr()
    const txTime = editingTx?.time || getTime()

    if (txType === 'sale') {
      const traysEquivalent = eggsCount / 30
      tx = {
        id: txId,
        customerId: customer.id,
        type: 'sale',
        date: txDate,
        time: txTime,
        trays: traysEquivalent,
        amountToBePaid: calculatedAmount,
        amountPaid: paid,
        paymentMethod,
        creditKeptToday,
        creditChange,
        notes: notes.trim(),
      }
    } else {
      tx = {
        id: txId,
        customerId: customer.id,
        type: 'payment',
        date: txDate,
        time: txTime,
        trays: 0,
        amountToBePaid: 0,
        amountPaid: paid,
        paymentMethod,
        creditKeptToday: 0,
        creditChange: paid,
        notes: notes.trim(),
      }
    }

    onSave(tx, newOutstanding)
    setSavedMsg(editingTx ? 'Updated successfully!' : 'Saved successfully!')
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
          className="rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{
            background: customer.outstandingCredit > 0 ? '#fff5f5' : '#f0fdf4',
            border: '1.5px solid',
            borderColor: customer.outstandingCredit > 0 ? '#fecaca' : '#bbf7d0',
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-600" style={{ color: customer.outstandingCredit > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>
              Current Outstanding Credit
            </p>
            <p className="text-xl font-800 mt-0.5" style={{ fontWeight: 800, color: customer.outstandingCredit > 0 ? '#dc2626' : '#059669' }}>
              {fmtCurrency(customer.outstandingCredit)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            {onOpenLedger && (
              <button
                type="button"
                onClick={onOpenLedger}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{ background: '#e0e7ff', color: '#3730a3' }}
              >
                <IconHistory />
                <span>Ledger</span>
              </button>
            )}
          </div>
        </div>

        {/* Transaction Type Segmented Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => setTxType('sale')}
            className={`flex-1 py-3 text-sm font-800 rounded-xl transition-all ${
              txType === 'sale'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🛒 Record Sale
          </button>
          <button
            type="button"
            onClick={() => setTxType('payment')}
            className={`flex-1 py-3 text-sm font-800 rounded-xl transition-all ${
              txType === 'payment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💰 Payment Only
          </button>
        </div>

        {/* ── Sale Form ── */}
        {txType === 'sale' && (
          <>
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
              <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>Today's Sale</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Number of Eggs */}
                <div>
                  <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Number of Eggs</label>
                  <input
                    type="number"
                    value={numEggs}
                    onChange={e => handleEggsChange(e.target.value)}
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
                    onChange={e => handleRateChange(e.target.value)}
                    placeholder="e.g. 225"
                    className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
                    style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Total Amount / Amount to Pay Input */}
              <div>
                <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Total Amount / Amount to Pay (₹)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={e => handleTotalChange(e.target.value)}
                  placeholder="e.g. 202.50"
                  className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
                  style={{ borderColor: '#a7f3d0', color: '#059669', fontWeight: 800 }}
                />
              </div>

              {/* Amount To Pay Calculation Banner */}
              {eggsCount > 0 && rate > 0 && (
                <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                  <p className="text-xs font-600" style={{ color: '#047857', fontWeight: 600 }}>
                    {eggsCount} eggs × ₹{rate} / 100 = {fmtCurrency(calculatedAmount)}
                  </p>
                </div>
              )}
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
                    onClick={() => setPaymentMethod('online')}
                    className="py-3 rounded-xl text-sm font-700 transition-all border"
                    style={{
                      background: paymentMethod === 'online' || paymentMethod === 'gpay' ? '#059669' : 'white',
                      color: paymentMethod === 'online' || paymentMethod === 'gpay' ? 'white' : '#374151',
                      borderColor: paymentMethod === 'online' || paymentMethod === 'gpay' ? '#059669' : '#e5e7eb',
                      fontWeight: 700,
                    }}
                  >
                    🌐 Online
                  </button>
                </div>

                {/* Instant QR Code Display when Online selected */}
                {(paymentMethod === 'online' || paymentMethod === 'gpay') && (
                  <PaymentQrCodeDisplay
                    businessProfile={businessProfile}
                    onProfileUpdated={setBusinessProfile}
                    showTitle={false}
                    compact={true}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Payment Only Form ── */}
        {txType === 'payment' && (
          <div className="rounded-2xl p-4 flex flex-col gap-3.5" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
            <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>Record Credit Payment</p>

            <div>
              <label className="text-xs font-600 mb-1 block text-gray-600">Amount Paid (₹)</label>
              <input
                type="number"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="e.g. 500"
                className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-blue-500 transition-colors"
                style={{ borderColor: '#bfdbfe', color: '#111827', fontWeight: 700 }}
              />
            </div>

            {/* Payment Method Toggle */}
            <div>
              <label className="text-xs font-600 mb-1.5 block text-gray-600">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className="py-3 rounded-xl text-sm font-700 transition-all border"
                  style={{
                    background: paymentMethod === 'cash' ? '#2563eb' : 'white',
                    color: paymentMethod === 'cash' ? 'white' : '#374151',
                    borderColor: paymentMethod === 'cash' ? '#2563eb' : '#e5e7eb',
                    fontWeight: 700,
                  }}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className="py-3 rounded-xl text-sm font-700 transition-all border"
                  style={{
                    background: paymentMethod === 'online' || paymentMethod === 'gpay' ? '#2563eb' : 'white',
                    color: paymentMethod === 'online' || paymentMethod === 'gpay' ? 'white' : '#374151',
                    borderColor: paymentMethod === 'online' || paymentMethod === 'gpay' ? '#2563eb' : '#e5e7eb',
                    fontWeight: 700,
                  }}
                >
                  🌐 Online
                </button>
              </div>

              {/* Instant QR Code Display when Online selected */}
              {(paymentMethod === 'online' || paymentMethod === 'gpay') && (
                <PaymentQrCodeDisplay
                  businessProfile={businessProfile}
                  onProfileUpdated={setBusinessProfile}
                  showTitle={false}
                  compact={true}
                />
              )}
            </div>

            <div>
              <label className="text-xs font-600 mb-1 block text-gray-600">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Clearing previous balance"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-600 border outline-none bg-white focus:border-blue-500 transition-colors"
                style={{ borderColor: '#e5e7eb', color: '#111827', fontWeight: 600 }}
              />
            </div>
          </div>
        )}

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
          disabled={!isFormValid}
          className="w-full py-4 rounded-2xl text-base font-800 active:scale-98 transition-all shadow-lg mt-2 disabled:opacity-50"
          style={{
            background: isFormValid ? (txType === 'sale' ? '#059669' : '#2563eb') : '#9ca3af',
            color: 'white',
            fontWeight: 800,
          }}
        >
          {savedMsg ? '✓ ' + savedMsg : txType === 'sale' ? 'Save Sale Transaction' : 'Save Credit Payment'}
        </button>
      </div>
    </div>
  )
}
