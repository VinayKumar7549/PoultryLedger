import { Customer, Expense, EggPurchase, Screen } from '../types'
import { today, fmtDate } from '../utils/date'
import { fmtCurrency, fmtTrays } from '../utils/format'
import { calculateBusinessSummary } from '../services/businessService'
import { calculateInventoryMetrics } from '../services/inventoryService'
import {
  IconEgg,
  IconRoute,
  IconWallet,
  IconHistory,
  IconBox,
  IconChevronRight,
} from '../components/common/Icons'

export function HomeScreen({
  customers,
  expenses,
  purchases,
  navigate,
}: {
  customers: Record<string, Customer>
  expenses: Expense[]
  purchases: EggPurchase[]
  navigate: (s: Screen, r?: string) => void
}) {
  const business = calculateBusinessSummary(customers, expenses, purchases)
  const inventory = calculateInventoryMetrics(purchases, customers)

  return (
    <div className="flex flex-col h-full bg-white px-4 pt-4 pb-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#059669' }}>
          <IconEgg />
        </div>
        <div>
          <p className="text-xs font-600" style={{ color: '#6b7280', fontWeight: 600 }}>Good Morning</p>
          <h1 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>Daily Sales</h1>
        </div>
      </div>

      {/* Date badge */}
      <div className="mb-4">
        <span className="inline-block px-4 py-1.5 rounded-full text-sm font-600" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>
          {fmtDate(today)}
        </span>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* ── Business Summary Card ── */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>Business Summary</p>
            <span className="text-xs font-600 px-2.5 py-0.5 rounded-full" style={{ background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>Today</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Today's Sales */}
            <div className="rounded-xl p-3" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
              <p className="text-xs font-500" style={{ color: '#6b7280' }}>Today's Sales</p>
              <p className="text-lg font-800 mt-0.5" style={{ color: '#059669', fontWeight: 800 }}>{fmtCurrency(business.todaySales)}</p>
            </div>

            {/* Today's Credit Given */}
            <div className="rounded-xl p-3" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
              <p className="text-xs font-500" style={{ color: '#6b7280' }}>Today's Credit Given</p>
              <p className="text-lg font-800 mt-0.5" style={{ color: '#dc2626', fontWeight: 800 }}>{fmtCurrency(business.todayCreditGiven)}</p>
            </div>

            {/* Total Outstanding Credit */}
            <div className="rounded-xl p-3" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
              <p className="text-xs font-500" style={{ color: '#6b7280' }}>Total Outstanding Credit</p>
              <p className="text-lg font-800 mt-0.5" style={{ color: '#dc2626', fontWeight: 800 }}>{fmtCurrency(business.totalOutstandingCredit)}</p>
            </div>

            {/* Today's Gross Profit */}
            <div className="rounded-xl p-3" style={{ background: 'white', border: '1px solid #f3f4f6' }}>
              <p className="text-xs font-500" style={{ color: '#6b7280' }}>Today's Gross Profit</p>
              <p className="text-lg font-800 mt-0.5" style={{ color: business.todayGrossProfit >= 0 ? '#059669' : '#dc2626', fontWeight: 800 }}>
                {fmtCurrency(business.todayGrossProfit)}
              </p>
            </div>
          </div>

          {/* Month-over-Month Comparisons */}
          <div style={{ height: '1px', background: '#e5e7eb' }} />
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <div>
              <p className="text-xs" style={{ color: '#9ca3af' }}>Last Month Gross Profit</p>
              <p className="text-sm font-700 mt-0.5" style={{ color: '#374151', fontWeight: 700 }}>{fmtCurrency(business.lastMonthGrossProfit)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: '#9ca3af' }}>Last Month Outstanding Credit</p>
              <p className="text-sm font-700 mt-0.5" style={{ color: '#374151', fontWeight: 700 }}>{fmtCurrency(business.lastMonthOutstandingCredit)}</p>
            </div>
          </div>
        </div>

        {/* ── Inventory Summary Card (2x2 Grid) ── */}
        <button
          onClick={() => navigate('inventory')}
          className="w-full rounded-2xl p-4 flex flex-col gap-3 active:scale-98 transition-transform text-left"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 8px 20px rgba(29,78,216,0.18)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ color: 'white' }}><IconBox /></div>
              </div>
              <p className="text-base font-800" style={{ color: 'white', fontWeight: 800 }}>Inventory Summary</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <span>Manage</span>
              <IconChevronRight />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Top Left: Remaining Eggs */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Remaining Eggs</p>
              <p className="text-lg font-800" style={{ color: '#6ee7b7', fontWeight: 800 }}>
                {inventory.remainingEggs.toLocaleString('en-IN')} eggs
              </p>
            </div>

            {/* Top Right: Remaining Trays */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Remaining Trays</p>
              <p className="text-lg font-800" style={{ color: 'white', fontWeight: 800 }}>
                {fmtTrays(inventory.remainingTrays)}
              </p>
            </div>

            {/* Bottom Left: Today's Purchase Cost */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Purchase Cost</p>
              <p className="text-lg font-800" style={{ color: '#93c5fd', fontWeight: 800 }}>
                {fmtCurrency(inventory.todayPurchaseCost)}
              </p>
            </div>

            {/* Bottom Right: Today's Purchases */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Purchases</p>
              <p className="text-lg font-800" style={{ color: 'white', fontWeight: 800 }}>
                {inventory.todayPurchasesCount} {inventory.todayPurchasesCount === 1 ? 'purchase' : 'purchases'}
              </p>
            </div>
          </div>
        </button>

        {/* Route Buttons */}
        <button
          onClick={() => navigate('route', 'r1')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-98 transition-transform text-left"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', minHeight: '90px' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ color: 'white' }}><IconRoute /></div>
          </div>
          <div className="flex-1">
            <p className="text-xl font-800" style={{ color: 'white', fontWeight: 800 }}>Route 1</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>5 customers · Start deliveries</p>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button
          onClick={() => navigate('route', 'r2')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-98 transition-transform text-left"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', minHeight: '90px' }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ color: 'white' }}><IconRoute /></div>
          </div>
          <div className="flex-1">
            <p className="text-xl font-800" style={{ color: 'white', fontWeight: 800 }}>Route 2</p>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>5 customers · Start deliveries</p>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Expenses */}
        <button
          onClick={() => navigate('expenses')}
          className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-98 transition-transform border-2 text-left"
          style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
            <div style={{ color: '#d97706' }}><IconWallet /></div>
          </div>
          <div className="flex-1">
            <p className="text-base font-700" style={{ color: '#111827', fontWeight: 700 }}>Expenses</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>Record daily business expenses</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* View History */}
        <button
          onClick={() => navigate('history')}
          className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-98 transition-transform border-2 text-left"
          style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#d1fae5' }}>
            <div style={{ color: '#059669' }}><IconHistory /></div>
          </div>
          <div className="flex-1">
            <p className="text-base font-700" style={{ color: '#111827', fontWeight: 700 }}>View History</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>Past transactions & records</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
