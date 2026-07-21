import { Expense } from '../types'
import { today, shiftDateStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import {
  IconMenu,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
} from '../components/common/Icons'

export function ExpenseHistoryScreen({
  expenses,
  expenseDate,
  setExpenseDate,
  onMenuOpen,
  onAddExpense,
}: {
  expenses: Expense[]
  expenseDate: string
  setExpenseDate: (d: string) => void
  onMenuOpen: () => void
  onAddExpense: () => void
}) {
  const dayExpenses = expenses.filter(e => e.date === expenseDate)
  dayExpenses.sort((a, b) => b.time.localeCompare(a.time))

  const totalExpenseDay = dayExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827' }}>Expense History</h2>
        </div>

        <button
          onClick={onAddExpense}
          className="px-3 py-1.5 rounded-full text-xs font-700 active:scale-95 transition-transform"
          style={{ background: '#059669', color: 'white', fontWeight: 700 }}
        >
          + Add
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
        <button
          onClick={() => setExpenseDate(shiftDateStr(expenseDate, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <IconChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          <div style={{ color: '#d97706' }}>
            <IconCalendar />
          </div>
          <span className="text-sm font-700" style={{ fontWeight: 700, color: '#111827' }}>
            {expenseDate === today ? 'Today' : fmtDate(expenseDate)}
          </span>
        </div>

        <button
          onClick={() => setExpenseDate(shiftDateStr(expenseDate, 1))}
          disabled={expenseDate === today}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform"
          style={{
            borderColor: '#e5e7eb',
            color: expenseDate === today ? '#d1d5db' : '#374151',
            opacity: expenseDate === today ? 0.5 : 1,
          }}
        >
          <IconChevronRight />
        </button>
      </div>

      {/* Daily Summary */}
      {dayExpenses.length > 0 && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#fffbe6', border: '1px solid #fef08a' }}>
            <div>
              <p className="text-xs font-600" style={{ color: '#b45309', fontWeight: 600 }}>Total Expenses ({fmtDate(expenseDate)})</p>
              <p className="text-xl font-800 mt-0.5" style={{ fontWeight: 800, color: '#d97706' }}>
                {fmtCurrency(totalExpenseDay)}
              </p>
            </div>
            <span className="text-xs font-700 px-3 py-1 rounded-full" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
              {dayExpenses.length} {dayExpenses.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {dayExpenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-1" style={{ background: '#fffbe6', color: '#d97706' }}>
              <IconWallet />
            </div>
            <p className="text-lg font-700" style={{ fontWeight: 700, color: '#111827' }}>No expenses on this day</p>
            <p className="text-xs max-w-xs" style={{ color: '#6b7280' }}>
              There are no business expenses logged for {fmtDate(expenseDate)}. Tap below to record a new expense.
            </p>
            <button
              onClick={onAddExpense}
              className="mt-3 px-5 py-3 rounded-xl text-sm font-700 active:scale-95 transition-transform"
              style={{ background: '#059669', color: 'white', fontWeight: 700 }}
            >
              + Add Expense
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dayExpenses.map(item => (
              <div
                key={item.id}
                className="rounded-2xl p-4 flex flex-col gap-2.5"
                style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
              >
                {/* Top Row: Purpose & Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-700 truncate" style={{ fontWeight: 700, color: '#111827' }}>
                      {item.purpose}
                    </p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>
                      {fmtDate(item.date)} · {item.time}
                    </p>
                  </div>
                  <p className="text-lg font-800" style={{ fontWeight: 800, color: '#b45309' }}>
                    {fmtCurrency(item.amount)}
                  </p>
                </div>

                <div style={{ height: '1px', background: '#e5e7eb' }} />

                {/* Bottom Row: Payment Method */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-600" style={{ color: '#6b7280', fontWeight: 600 }}>Payment Method:</span>
                  <span
                    className="text-xs font-700 px-3 py-1 rounded-full"
                    style={{
                      background: item.paymentMethod === 'gpay' ? '#eff6ff' : '#f0fdf4',
                      color: item.paymentMethod === 'gpay' ? '#2563eb' : '#059669',
                      border: '1px solid',
                      borderColor: item.paymentMethod === 'gpay' ? '#bfdbfe' : '#bbf7d0',
                      fontWeight: 700,
                    }}
                  >
                    {item.paymentMethod === 'gpay' ? '📱 GPay' : '💵 Cash'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
