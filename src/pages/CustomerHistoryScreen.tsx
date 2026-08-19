import { useState, useMemo } from 'react'
import { Customer, Screen, Transaction } from '../types'
import { RouteEntity } from '../database'
import { fmtCurrency } from '../utils/format'
import { fmtDate, getTodayStr, parseOpeningBalanceTimestamp, compareTimestampsAsc, compareTimestampsDesc } from '../utils/date'
import { pdfReportDataService, DateRange, resolveDateRange, DateFilterOption } from '../services/pdfReportDataService'
import { FileActionResult } from '../services/fileService'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'
import { TransactionBadge, PaymentMethodBadge, TransactionDot } from '../components/common/TransactionBadges'
import {
  IconBack,
  IconPdf,
  IconMoreVertical,
  IconEdit,
  IconTrash,
  IconCalendar,
} from '../components/common/Icons'

export function CustomerHistoryScreen({
  customerId,
  routeId,
  customers,
  routes,
  routeNames,
  onBack,
  onUpdateCustomer,
  onEditTransaction,
  onDeleteTransaction,
}: {
  customerId: string
  routeId?: string
  customers: Record<string, Customer>
  routes?: RouteEntity[]
  routeNames?: Record<string, string>
  onBack: () => void
  onUpdateCustomer?: (id: string, name: string, subtitle: string, routeId: string, openingCredit?: number) => void
  onEditTransaction?: (tx: Transaction) => void
  onDeleteTransaction?: (id: string, customerId: string) => void
  onNavigate?: (screen: Screen) => void
}) {
  const customer = customers[customerId]

  // Filter States
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'payments' | 'adjustments'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('this_month')
  const [customStart, setCustomStart] = useState<string>(() => getTodayStr())
  const [customEnd, setCustomEnd] = useState<string>(() => getTodayStr())
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false)

  // Overflow Menu & Edit Modal States
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)
  const [editName, setEditName] = useState<string>(customer?.name || '')
  const [editSubtitle, setEditSubtitle] = useState<string>(customer?.subtitle || '')
  const [editRouteId, setEditRouteId] = useState<string>(customer?.routeId || routeId || '')
  const [editOpeningCredit, setEditOpeningCredit] = useState<string>(String(customer?.openingCredit || 0))
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)

  // PDF Export State
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportModalDetails, setExportModalDetails] = useState<FileActionResult | null>(null)

  const routeTitle =
    (customer && routeNames && routeNames[customer.routeId]) ||
    (routeId && routeNames && routeNames[routeId]) ||
    'General Route'

  const routeOptions =
    routes && routes.length > 0
      ? routes.map(r => ({ id: r.id, name: r.name }))
      : routeNames
      ? Object.entries(routeNames).map(([id, name]) => ({ id, name }))
      : [{ id: customer?.routeId || '1', name: routeTitle }]

  // Resolve current date range
  const dateRange: DateRange = useMemo(() => {
    return resolveDateRange(dateFilter, customStart, customEnd, getTodayStr())
  }, [dateFilter, customStart, customEnd])

  // Calculate timeline & metrics
  const { filteredTimeline, metrics } = useMemo(() => {
    if (!customer) {
      return {
        allTimeline: [],
        filteredTimeline: [],
        metrics: {
          totalEggsSold: 0,
          totalTraysSold: 0,
          totalSalesAmount: 0,
          totalPaidAmount: 0,
          outstandingBalance: 0,
          lastTransactionDate: null as string | null,
        },
      }
    }

    const rawTxs = customer.transactions || []
    const rawItems: Array<any> = rawTxs.map(t => {
      const billed = Number(t.amountToBePaid) || 0
      const paid = Number(t.amountPaid) || 0
      const trays = Number(t.trays) || 0
      const eggs = Math.round(trays * 30)
      const isSale = t.type === 'sale' || trays > 0 || billed > 0

      return {
        id: t.id,
        rawTx: t as Transaction | undefined,
        date: t.date,
        time: t.time || '',
        type: (isSale ? 'sale' : 'payment') as 'sale' | 'payment' | 'opening' | 'adjustment',
        trays,
        totalEggs: eggs,
        ratePer100: eggs > 0 ? (billed / eggs) * 100 : 0,
        billed,
        paid,
        paymentMethod: t.paymentMethod || 'cash',
        creditKeptToday: Number(t.creditKeptToday) || 0,
        creditChange: Number(t.creditChange) || 0,
        notes: t.notes || '',
        createdAt: t.createdAt,
      }
    })

    // Add Opening Balance item if exists
    if (customer.openingCredit && customer.openingCredit > 0) {
      const timestamp = (customer as any).openingCreditCreatedAt || (customer as any).createdAt
      const { date: openingDate, time: openingTime } = parseOpeningBalanceTimestamp(timestamp)
      rawItems.push({
        id: 'opening-balance',
        rawTx: undefined,
        date: openingDate,
        time: openingTime,
        type: 'opening',
        trays: 0,
        totalEggs: 0,
        ratePer100: 0,
        billed: customer.openingCredit,
        paid: 0,
        paymentMethod: 'cash',
        creditKeptToday: 0,
        creditChange: customer.openingCredit,
        notes: 'Initial Opening Credit',
        createdAt: timestamp,
      })
    }

    // Sort chronologically (oldest first)
    rawItems.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.createdAt, b.createdAt))

    // Compute running balances & metrics
    let running = 0
    let totalEggs = 0
    let totalTrays = 0
    let totalSales = 0
    let totalPaid = 0
    let lastDate: string | null = null

    const processed = rawItems.map(item => {
      if (item.type !== 'opening') {
        totalSales += item.billed
        totalPaid += item.paid
        totalTrays += item.trays
        totalEggs += item.totalEggs
        if (item.date) lastDate = item.date
      }
      running += item.billed - item.paid
      return { ...item, runningBalance: running }
    })

    // Newest transactions first for timeline
    const reverseTimeline = [...processed].sort((a, b) => compareTimestampsDesc(a.date, a.time, b.date, b.time, a.createdAt, b.createdAt))

    // Filter by type & date
    const filtered = reverseTimeline.filter(item => {
      if (dateFilter !== 'all_time' as any) {
        if (item.date < dateRange.startDate || item.date > dateRange.endDate) {
          return false
        }
      }

      // Type filter
      if (filterType === 'sales' && item.type !== 'sale') return false
      if (filterType === 'payments' && item.type !== 'payment') return false
      if (filterType === 'adjustments' && item.type !== 'adjustment' && item.type !== 'opening') return false

      return true
    })

    return {
      allTimeline: reverseTimeline,
      filteredTimeline: filtered,
      metrics: {
        totalEggsSold: totalEggs,
        totalTraysSold: totalTrays,
        totalSalesAmount: totalSales,
        totalPaidAmount: totalPaid,
        outstandingBalance: Number(customer.outstandingCredit) || 0,
        lastTransactionDate: lastDate,
      },
    }
  }, [customer, dateRange, filterType, dateFilter])

  // Handle PDF Export
  const handleExportPdf = async () => {
    if (!customer) return
    try {
      setIsExporting(true)
      const statement = await pdfReportDataService.getCustomerStatement(customer.id, dateRange)
      if (!statement) {
        throw new Error('Could not load statement report data.')
      }

      const { generateCustomerStatementPdf } = await import('../services/pdfGenerator')
      const result = await generateCustomerStatementPdf(statement)

      if (result && result.success) {
        setExportModalDetails(result)
      } else {
        alert(result?.message || 'Failed to export PDF.')
      }
    } catch (err: any) {
      console.error('[CustomerHistoryScreen] PDF Export error:', err)
      alert(err?.message || 'Failed to generate PDF statement.')
    } finally {
      setIsExporting(false)
    }
  }

  // Handle Save Edit Customer
  const handleSaveEdit = () => {
    if (!customer || !editName.trim()) return
    const openingNum = parseFloat(editOpeningCredit) || 0
    if (onUpdateCustomer) {
      onUpdateCustomer(customer.id, editName.trim(), editSubtitle.trim(), editRouteId, openingNum)
    }
    setShowEditModal(false)
    setShowMenu(false)
  }

  if (!customer) {
    return (
      <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-slate-600 mb-4">Customer record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 relative overflow-hidden">
      <ExportSuccessModal details={exportModalDetails} onClose={() => setExportModalDetails(null)} />

      {/* ── 1. TOP APP BAR ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xs z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-all"
            title="Back"
          >
            <IconBack />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 truncate leading-tight">
              {customer.name}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
              {customer.subtitle ? `${customer.subtitle} • ${routeTitle}` : routeTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <IconPdf />
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Overflow Menu (⋮) */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
              title="More Options"
            >
              <IconMoreVertical />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 w-44 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setEditName(customer.name)
                      setEditSubtitle(customer.subtitle || '')
                      setEditRouteId(customer.routeId)
                      setEditOpeningCredit(String(customer.openingCredit || 0))
                      setShowMenu(false)
                      setShowEditModal(true)
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <IconEdit />
                    <span>Edit Customer</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* ── 2. METRICS SUMMARY SECTION ── */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Customer Summary
            </span>
            {metrics.lastTransactionDate && (
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Last TX: {fmtDate(metrics.lastTransactionDate)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Outstanding Balance */}
            <div className="bg-red-50/70 border border-red-100 p-3 rounded-2xl col-span-2 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-600 block">Current Outstanding Balance</span>
                <span className="text-xl font-black text-red-700">{fmtCurrency(metrics.outstandingBalance)}</span>
              </div>
              <span className="text-xs font-extrabold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                {metrics.outstandingBalance > 0 ? 'Pending Credit' : 'Clear'}
              </span>
            </div>

            {/* Total Eggs Sold */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Eggs Sold</span>
              <span className="text-sm font-black text-slate-800">
                {metrics.totalTraysSold} Trays ({metrics.totalEggsSold} eggs)
              </span>
            </div>

            {/* Total Billed Sales */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Billed</span>
              <span className="text-sm font-black text-emerald-700">{fmtCurrency(metrics.totalSalesAmount)}</span>
            </div>

            {/* Total Payments */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payments Received</span>
              <span className="text-sm font-black text-blue-700">{fmtCurrency(metrics.totalPaidAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── 3. FILTERS BAR ── */}
        <div className="flex flex-col gap-2">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Transactions' },
                { id: 'sales', label: 'Sales Only' },
                { id: 'payments', label: 'Payments Only' },
                { id: 'adjustments', label: 'Opening / Adjustments' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all flex-shrink-0 ${
                  filterType === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Filter Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 flex items-center justify-between gap-1 overflow-x-auto text-xs">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'this_year', label: 'This Year' },
                  { id: 'all_time', label: 'All Time' },
                ] as const
              ).map(d => (
                <button
                  key={d.id}
                  onClick={() => {
                    setDateFilter(d.id as any)
                    setShowDatePicker(false)
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-colors ${
                    dateFilter === d.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center gap-1 flex-shrink-0"
              title="Custom Date Range"
            >
              <IconCalendar />
            </button>
          </div>

          {/* Custom Date Picker Inputs */}
          {showDatePicker && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in duration-150">
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">From Date</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => {
                    setCustomStart(e.target.value)
                    setDateFilter('custom')
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">To Date</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => {
                    setCustomEnd(e.target.value)
                    setDateFilter('custom')
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── 4. TIMELINE HISTORY LIST ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Transaction Timeline ({filteredTimeline.length})
            </span>
            <span className="text-[11px] font-bold text-slate-400">{dateRange.label}</span>
          </div>

          {filteredTimeline.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
                📜
              </div>
              <p className="text-xs font-extrabold text-slate-700">No transactions recorded</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                No matching sales or payments found for the selected filter and date range.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-3">
              {/* Vertical Timeline Line */}
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200" />

              {filteredTimeline.map(item => {
                const isSale = item.type === 'sale'
                const isPayment = item.type === 'payment'
                const isOpening = item.type === 'opening'

                const txLike = {
                  type: item.type,
                  amountToBePaid: item.billed,
                  amountPaid: item.paid,
                  creditKeptToday: item.creditKeptToday,
                  trays: item.trays,
                }

                return (
                  <div key={item.id} className="relative bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                    {/* Timeline Node Point */}
                    <TransactionDot tx={txLike} className="absolute -left-[19px] top-4" />

                    {/* Card Header: Row 1 (Type Badge & Date), Row 2 (Payment Method Badge) */}
                    <div className="flex flex-col gap-1.5 mb-2">
                      <div className="flex items-center justify-between gap-2">
                        <TransactionBadge tx={txLike} />
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                            {fmtDate(item.date)} {item.time ? `• ${item.time}` : ''}
                          </span>
                          {!isOpening && item.rawTx && (
                            <div className="flex items-center gap-1">
                              {onEditTransaction && (
                                <button
                                  onClick={() => onEditTransaction(item.rawTx!)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  title="Edit Transaction"
                                >
                                  <IconEdit />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button
                                  onClick={() => setTxToDelete(item.rawTx!)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors"
                                  title="Delete Transaction"
                                >
                                  <IconTrash />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {!isOpening && (
                        <div>
                          <PaymentMethodBadge method={item.paymentMethod} amountPaid={item.paid} />
                        </div>
                      )}
                    </div>

                    {/* Card Body Details */}
                    {isSale ? (
                      <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                        <div className="flex items-center justify-between font-extrabold text-slate-900">
                          <span>
                            {item.trays} Trays ({item.totalEggs} eggs)
                          </span>
                          <span className="text-emerald-700 font-black text-sm">
                            + {fmtCurrency(item.billed)}
                          </span>
                        </div>

                        {item.ratePer100 > 0 && (
                          <p className="text-[11px] font-bold text-slate-500">
                            Egg Rate: {fmtCurrency(item.ratePer100)} / 100 eggs
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                          <span>Paid Today: {fmtCurrency(item.paid)}</span>
                          <span className="font-bold text-red-600">Credit Kept: {fmtCurrency(item.creditKeptToday)}</span>
                        </div>
                      </div>
                    ) : isPayment ? (
                      <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                        <div className="flex items-center justify-between font-extrabold text-slate-900">
                          <span>Payment Received</span>
                          <span className="text-blue-700 font-black text-sm">
                            - {fmtCurrency(item.paid)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                        <div className="flex items-center justify-between font-extrabold text-slate-900">
                          <span>Initial Opening Balance</span>
                          <span className="text-slate-700 font-black">{fmtCurrency(item.billed)}</span>
                        </div>
                      </div>
                    )}

                    {/* Running Outstanding Balance Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                      {item.notes ? (
                        <span className="italic text-slate-500 font-medium truncate max-w-[180px]">
                          Note: {item.notes}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="font-extrabold text-slate-700">
                        Balance: <span className="text-slate-900 font-black">{fmtCurrency(item.runningBalance)}</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. EDIT CUSTOMER MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900">Edit Customer Details</h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Subtitle / Shop Name</label>
                <input
                  type="text"
                  value={editSubtitle}
                  onChange={e => setEditSubtitle(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Delivery Route</label>
                <select
                  value={editRouteId}
                  onChange={e => setEditRouteId(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {routeOptions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Opening Credit (₹)</label>
                <input
                  type="number"
                  value={editOpeningCredit}
                  onChange={e => setEditOpeningCredit(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Transaction Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Transaction</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to delete this transaction?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (txToDelete && onDeleteTransaction) {
                    onDeleteTransaction(txToDelete.id, txToDelete.customerId)
                    setTxToDelete(null)
                  }
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
