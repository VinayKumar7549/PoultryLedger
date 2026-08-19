import { useState } from 'react'
import { Expense, PaymentMethod } from '../types'
import { getTodayStr, getTime, uid } from '../utils/date'
import { IconBack } from '../components/common/Icons'

export function AddExpenseScreen({
  selectedDate,
  onBack,
  onSaveExpense,
}: {
  selectedDate?: string
  onBack: () => void
  onSaveExpense: (expense: Expense) => void
}) {
  const curToday = getTodayStr()
  const initialDate = selectedDate && selectedDate <= curToday ? selectedDate : curToday
  const [expenseDate, setExpenseDate] = useState(initialDate)
  const [amountSpent, setAmountSpent] = useState('')
  const [purpose, setPurpose] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [savedMsg, setSavedMsg] = useState('')

  const amountVal = parseFloat(amountSpent) || 0

  const handleSave = () => {
    const liveToday = getTodayStr()
    if (amountVal <= 0 || !purpose.trim() || expenseDate > liveToday) return

    const newExpense: Expense = {
      id: 'e' + uid(),
      date: expenseDate && expenseDate <= liveToday ? expenseDate : liveToday,
      time: getTime(),
      amount: amountVal,
      purpose: purpose.trim(),
      paymentMethod,
    }

    onSaveExpense(newExpense)
    setSavedMsg('Expense saved successfully!')
    setTimeout(() => {
      onBack()
    }, 600)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* AppBar */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <IconBack />
          </button>
          <h1 className="text-xl font-800 text-gray-900">Record Business Expense</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-4">

          {savedMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-700 flex items-center gap-2 shadow-xs">
              <span>✓</span>
              <span>{savedMsg}</span>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="text-xs font-600 mb-1 block text-gray-600">Expense Date</label>
            <input
              type="date"
              value={expenseDate}
              max={getTodayStr()}
              onChange={e => {
                const val = e.target.value
                if (!val) return
                if (val <= getTodayStr()) {
                  setExpenseDate(val)
                }
              }}
              className="w-full rounded-xl px-3.5 py-3 text-sm font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Purpose */}
          <div>
            <label className="text-xs font-600 mb-1 block text-gray-600">Expense Reason / Category</label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Vehicle Fuel, Shop Rent, Egg Trays"
              className="w-full rounded-xl px-3.5 py-3 text-sm font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-600 mb-1 block text-gray-600">Amount Spent (₹)</label>
            <input
              type="number"
              value={amountSpent}
              onChange={e => setAmountSpent(e.target.value)}
              placeholder="e.g. 500"
              className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#111827', fontWeight: 700 }}
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
                  background: paymentMethod === 'online' ? '#059669' : 'white',
                  color: paymentMethod === 'online' ? 'white' : '#374151',
                  borderColor: paymentMethod === 'online' ? '#059669' : '#e5e7eb',
                  fontWeight: 700,
                }}
              >
                🌐 Online
              </button>
            </div>
          </div>
        </div>

        {/* Save Expense Button */}
        <button
          onClick={handleSave}
          disabled={amountVal <= 0 || !purpose.trim() || expenseDate > getTodayStr()}
          className="w-full py-4 rounded-2xl text-base font-800 active:scale-98 transition-all shadow-lg mt-2 disabled:opacity-50"
          style={{
            background: amountVal > 0 && purpose.trim() && expenseDate <= getTodayStr() ? '#059669' : '#9ca3af',
            color: 'white',
            fontWeight: 800,
          }}
        >
          Save Expense (₹{amountVal > 0 ? amountVal.toLocaleString('en-IN') : '0'})
        </button>
      </div>
    </div>
  )
}
