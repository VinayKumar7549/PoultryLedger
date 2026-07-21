import { Customer, Transaction } from '../types'
import { today, shiftDateStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import {
  IconMenu,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconList,
} from '../components/common/Icons'

export function HistoryScreen({
  customers,
  historyDate,
  setHistoryDate,
  onMenuOpen,
}: {
  customers: Record<string, Customer>
  historyDate: string
  setHistoryDate: (d: string) => void
  onMenuOpen: () => void
}) {
  const allTxWithCustomer: { tx: Transaction; customer: Customer }[] = []
  Object.values(customers).forEach(c => {
    c.transactions.forEach(t => {
      if (t.date === historyDate) {
        allTxWithCustomer.push({ tx: t, customer: c })
      }
    })
  })

  // Sort newest first
  allTxWithCustomer.sort((a, b) => b.tx.time.localeCompare(a.tx.time))

  const totalSalesDay = allTxWithCustomer.reduce((sum, item) => sum + item.tx.amountToBePaid, 0)
  const totalPaidDay = allTxWithCustomer.reduce((sum, item) => sum + item.tx.amountPaid, 0)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827' }}>Daily Transactions</h2>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
        <button
          onClick={() => setHistoryDate(shiftDateStr(historyDate, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <IconChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          <div style={{ color: '#059669' }}>
            <IconCalendar />
          </div>
          <span className="text-sm font-700" style={{ fontWeight: 700, color: '#111827' }}>
            {historyDate === today ? 'Today' : fmtDate(historyDate)}
          </span>
        </div>

        <button
          onClick={() => setHistoryDate(shiftDateStr(historyDate, 1))}
          disabled={historyDate === today}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform"
          style={{
            borderColor: '#e5e7eb',
            color: historyDate === today ? '#d1d5db' : '#374151',
            opacity: historyDate === today ? 0.5 : 1,
          }}
        >
          <IconChevronRight />
        </button>
      </div>

      {/* Daily Summary */}
      {allTxWithCustomer.length > 0 && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div>
              <p className="text-xs font-600" style={{ color: '#065f46', fontWeight: 600 }}>Total Sales ({fmtDate(historyDate)})</p>
              <p className="text-xl font-800 mt-0.5" style={{ fontWeight: 800, color: '#059669' }}>
                {fmtCurrency(totalSalesDay)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-600" style={{ color: '#065f46', fontWeight: 600 }}>Amount Collected</p>
              <p className="text-lg font-800 mt-0.5" style={{ fontWeight: 800, color: '#047857' }}>
                {fmtCurrency(totalPaidDay)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {allTxWithCustomer.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-1" style={{ background: '#f3f4f6', color: '#9ca3af' }}>
              <IconList />
            </div>
            <p className="text-lg font-700" style={{ fontWeight: 700, color: '#111827' }}>No transactions on this date</p>
            <p className="text-xs max-w-xs" style={{ color: '#6b7280' }}>
              There are no recorded sales for {fmtDate(historyDate)}. Use the date navigation above to check other days.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {allTxWithCustomer.map(({ tx, customer }) => {
              const eggCount = Math.round(tx.trays * 30)
              const ratePer100 = eggCount > 0 ? (tx.amountToBePaid * 100) / eggCount : 0
              return (
                <div
                  key={tx.id}
                  className="rounded-2xl p-4 flex flex-col gap-2.5"
                  style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
                >
                  {/* Top Row: Customer & Time */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-700" style={{ fontWeight: 700, color: '#111827' }}>
                        {customer.name}
                      </p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>
                        {customer.subtitle} · {tx.time}
                      </p>
                    </div>
                    <span
                      className="text-xs font-700 px-3 py-1 rounded-full"
                      style={{
                        background: tx.paymentMethod === 'gpay' ? '#eff6ff' : '#f0fdf4',
                        color: tx.paymentMethod === 'gpay' ? '#2563eb' : '#059669',
                        border: '1px solid',
                        borderColor: tx.paymentMethod === 'gpay' ? '#bfdbfe' : '#bbf7d0',
                        fontWeight: 700,
                      }}
                    >
                      {tx.paymentMethod === 'gpay' ? '📱 GPay' : '💵 Cash'}
                    </span>
                  </div>

                  <div style={{ height: '1px', background: '#e5e7eb' }} />

                  {/* Quantity & Calculation breakdown */}
                  <div className="flex items-center justify-between text-xs" style={{ color: '#4b5563' }}>
                    <span>Quantity: <strong style={{ color: '#111827' }}>{eggCount} eggs</strong> ({tx.trays} trays)</span>
                    <span className="font-600" style={{ fontWeight: 600, color: '#059669' }}>
                      {eggCount} eggs × ₹{ratePer100.toFixed(0)} / 100 = {fmtCurrency(tx.amountToBePaid)}
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-xl p-2" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Amount Paid</p>
                      <p className="text-base font-800" style={{ fontWeight: 800, color: '#059669' }}>
                        {fmtCurrency(tx.amountPaid)}
                      </p>
                    </div>
                    <div className="rounded-xl p-2" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
                      <p className="text-xs" style={{ color: '#6b7280' }}>Credit Kept</p>
                      <p className="text-base font-800" style={{ fontWeight: 800, color: tx.creditKeptToday > 0 ? '#dc2626' : '#059669' }}>
                        {fmtCurrency(tx.creditKeptToday)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
