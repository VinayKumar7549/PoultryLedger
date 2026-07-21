import { useState } from 'react'
import { Expense, PaymentMethod } from '../types'
import { today, getTime, uid } from '../utils/date'
import { IconBack } from '../components/common/Icons'

export function AddExpenseScreen({
  onBack,
  onSaveExpense,
}: {
  onBack: () => void
  onSaveExpense: (expense: Expense) => void
}) {
  const [amountSpent, setAmountSpent] = useState('')
  const [purpose, setPurpose] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [savedMsg, setSavedMsg] = useState('')

  const amountVal = parseFloat(amountSpent) || 0

  const handleSave = () => {
    if (amountVal <= 0 || !purpose.trim()) return

    const newExpense: Expense = {
      id: 'e' + uid(),
      date: today,
      time: getTime(),
      amount: amountVal,
      purpose: purpose.trim(),
      paymentMethod,
    }

    onSaveExpense(newExpense)
    setSavedMsg('Expense Saved!')
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
        <div className="flex-1">
          <h2 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>Add Expense</h2>
          <p className="text-xs" style={{ color: '#6b7280' }}>Record daily business expense</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Expense Card */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
          {/* Amount Spent */}
          <div>
            <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Amount Spent (₹)</label>
            <input
              type="number"
              value={amountSpent}
              onChange={e => setAmountSpent(e.target.value)}
              placeholder="e.g. 350"
              className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Purpose / Description */}
          <div>
            <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Purpose / Description</label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Vehicle Fuel (Petrol), Tea & Snacks"
              className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Payment Method */}
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

        {/* Save Expense Button */}
        <button
          onClick={handleSave}
          disabled={amountVal <= 0 || !purpose.trim()}
          className="w-full py-4 rounded-2xl text-base font-800 active:scale-98 transition-all shadow-lg mt-2"
          style={{
            background: amountVal > 0 && purpose.trim() ? '#059669' : '#9ca3af',
            color: 'white',
            fontWeight: 800,
          }}
        >
          {savedMsg ? '✓ ' + savedMsg : 'Save Expense'}
        </button>
      </div>
    </div>
  )
}
