import { useState } from 'react'
import { Customer } from '../types'
import { ROUTE_NAMES } from '../data/seedData'
import { fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import {
  IconMenu,
  IconBack,
  IconChevronRight,
  IconCreditCard,
} from '../components/common/Icons'

export function CreditRecordsScreen({
  customers,
  routeCustomerMap,
  onMenuOpen,
}: {
  customers: Record<string, Customer>
  routeCustomerMap: Record<string, string[]>
  onMenuOpen: () => void
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const selectedCustomer = selectedCustomerId ? customers[selectedCustomerId] : null

  // If viewing a specific customer's Credit History
  if (selectedCustomer) {
    // Sort transactions reverse chronological (newest first)
    const sortedTx = [...selectedCustomer.transactions].sort((a, b) => {
      const dateTimeA = `${a.date} ${a.time}`
      const dateTimeB = `${b.date} ${b.time}`
      return dateTimeB.localeCompare(dateTimeA)
    })

    // Compute running outstanding credit
    let runningCredit = selectedCustomer.outstandingCredit
    const historyEntries = sortedTx.map(tx => {
      const entryOutstanding = runningCredit
      const netCreditChange = (tx.creditKeptToday || 0) - Math.max(0, tx.amountPaid - tx.amountToBePaid)
      runningCredit = Math.max(0, runningCredit - netCreditChange)

      return {
        tx,
        updatedOutstanding: entryOutstanding,
        creditAdded: tx.creditKeptToday || 0,
        creditReduced: Math.max(0, tx.amountPaid - tx.amountToBePaid),
      }
    })

    return (
      <div className="flex flex-col h-full bg-white relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
          <button
            onClick={() => setSelectedCustomerId(null)}
            className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100"
            style={{ color: '#111827' }}
          >
            <IconBack />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-800 truncate" style={{ fontWeight: 800, color: '#111827' }}>
              {selectedCustomer.name}
            </h2>
            <p className="text-xs truncate" style={{ color: '#6b7280' }}>
              Credit History
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Outstanding credit card */}
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{
              background: selectedCustomer.outstandingCredit > 0 ? '#fff5f5' : '#f0fdf4',
              border: '1.5px solid',
              borderColor: selectedCustomer.outstandingCredit > 0 ? '#fecaca' : '#bbf7d0',
            }}
          >
            <div>
              <p className="text-xs font-600" style={{ color: selectedCustomer.outstandingCredit > 0 ? '#991b1b' : '#166534', fontWeight: 600 }}>
                Current Outstanding Credit
              </p>
              <p className="text-2xl font-800 mt-0.5" style={{ fontWeight: 800, color: selectedCustomer.outstandingCredit > 0 ? '#dc2626' : '#059669' }}>
                {fmtCurrency(selectedCustomer.outstandingCredit)}
              </p>
            </div>
            <span
              className="text-xs font-700 px-3.5 py-1.5 rounded-full"
              style={{
                background: selectedCustomer.outstandingCredit > 0 ? '#fee2e2' : '#d1fae5',
                color: selectedCustomer.outstandingCredit > 0 ? '#dc2626' : '#065f46',
                fontWeight: 700,
              }}
            >
              {selectedCustomer.outstandingCredit > 0 ? 'Outstanding' : 'Cleared'}
            </span>
          </div>

          {/* Timeline of credit history */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>
              Transaction & Credit Timeline
            </p>

            {historyEntries.length === 0 ? (
              <div className="py-12 text-center text-xs" style={{ color: '#6b7280' }}>
                No credit transactions logged for this customer.
              </div>
            ) : (
              historyEntries.map(({ tx, updatedOutstanding, creditAdded, creditReduced }) => {
                const eggCount = Math.round(tx.trays * 30)

                return (
                  <div
                    key={tx.id}
                    className="rounded-2xl p-4 flex flex-col gap-2.5"
                    style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
                  >
                    {/* Top Row: Date & Time */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-700" style={{ fontWeight: 700, color: '#111827' }}>
                        {fmtDate(tx.date)} · {tx.time}
                      </span>
                      <span
                        className="text-xs font-700 px-2.5 py-0.5 rounded-full"
                        style={{
                          background: tx.paymentMethod === 'gpay' ? '#eff6ff' : '#f0fdf4',
                          color: tx.paymentMethod === 'gpay' ? '#2563eb' : '#059669',
                          fontWeight: 700,
                        }}
                      >
                        {tx.paymentMethod === 'gpay' ? '📱 GPay' : '💵 Cash'}
                      </span>
                    </div>

                    <div style={{ height: '1px', background: '#e5e7eb' }} />

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span style={{ color: '#6b7280' }}>Today's Sale: </span>
                        <strong style={{ color: '#111827' }}>{fmtCurrency(tx.amountToBePaid)}</strong>
                        <p className="text-xs" style={{ color: '#9ca3af' }}>{eggCount} eggs ({tx.trays} trays)</p>
                      </div>
                      <div className="text-right">
                        <span style={{ color: '#6b7280' }}>Amount Paid: </span>
                        <strong style={{ color: '#059669' }}>{fmtCurrency(tx.amountPaid)}</strong>
                      </div>
                    </div>

                    {/* Credit Impact Badge */}
                    <div className="flex items-center justify-between pt-1">
                      {creditAdded > 0 && (
                        <span className="text-xs font-700 px-3 py-1 rounded-xl" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                          + {fmtCurrency(creditAdded)} Credit Added
                        </span>
                      )}
                      {creditReduced > 0 && (
                        <span className="text-xs font-700 px-3 py-1 rounded-xl" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>
                          - {fmtCurrency(creditReduced)} Credit Reduced
                        </span>
                      )}
                      {creditAdded === 0 && creditReduced === 0 && (
                        <span className="text-xs font-600 px-3 py-1 rounded-xl" style={{ background: '#e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                          No Credit Change
                        </span>
                      )}

                      <div className="text-right">
                        <span className="text-xs" style={{ color: '#6b7280' }}>Outstanding After: </span>
                        <span className="text-sm font-800" style={{ fontWeight: 800, color: updatedOutstanding > 0 ? '#dc2626' : '#059669' }}>
                          {fmtCurrency(updatedOutstanding)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // Otherwise render Overview Screen of all Customer Credit Cards grouped by Route
  const routeIds = Object.keys(routeCustomerMap)
  const totalSystemCredit = Object.values(customers).reduce((sum, c) => sum + c.outstandingCredit, 0)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827' }}>Credit Records</h2>
        </div>
      </div>

      {/* System total outstanding credit banner */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#fff5f5', border: '1.5px solid #fecaca' }}>
          <div>
            <p className="text-xs font-600" style={{ color: '#991b1b', fontWeight: 600 }}>Total Outstanding Credit</p>
            <p className="text-2xl font-800 mt-0.5" style={{ fontWeight: 800, color: '#dc2626' }}>
              {fmtCurrency(totalSystemCredit)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <IconCreditCard />
          </div>
        </div>
      </div>

      {/* Customer summary cards grouped by Route */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {routeIds.map(rId => {
          const cIds = routeCustomerMap[rId] || []
          const list = cIds.map(id => customers[id]).filter(Boolean)
          const routeTitle = ROUTE_NAMES[rId] || rId

          return (
            <div key={rId} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-700 uppercase tracking-wider" style={{ color: '#6b7280', fontWeight: 700 }}>
                  {routeTitle}
                </span>
                <span className="text-xs" style={{ color: '#9ca3af' }}>{list.length} customers</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {list.map(cust => {
                  const hasCredit = cust.outstandingCredit > 0
                  const lastTx = cust.transactions[cust.transactions.length - 1]
                  const lastUpdatedStr = lastTx ? `${fmtDate(lastTx.date)} · ${lastTx.time}` : 'No transactions'

                  return (
                    <button
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className="rounded-2xl p-4 border flex items-center justify-between text-left active:scale-98 transition-transform"
                      style={{
                        background: hasCredit ? '#fff5f5' : '#f9fafb',
                        borderColor: hasCredit ? '#fecaca' : '#e5e7eb',
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-base font-700 truncate" style={{ fontWeight: 700, color: '#111827' }}>
                          {cust.name}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>
                          {cust.subtitle}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                          Last Updated: {lastUpdatedStr}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs font-600" style={{ color: '#6b7280', fontWeight: 600 }}>Credit</p>
                          <p className="text-base font-800" style={{ fontWeight: 800, color: hasCredit ? '#dc2626' : '#059669' }}>
                            {fmtCurrency(cust.outstandingCredit)}
                          </p>
                        </div>
                        <div style={{ color: '#9ca3af' }}>
                          <IconChevronRight />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
