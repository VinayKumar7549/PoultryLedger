import { useState, useEffect } from 'react'
import { Customer, Expense, EggPurchase } from '../types'
import { getTodayStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { IconMenu } from '../components/common/Icons'
import {
  pdfReportDataService,
  DateFilterOption,
  resolveDateRange,
  CustomerStatementReport,
  CreditReport,
  ExpenseReport,
  SalesReport,
  InventoryReport,
  DailySummaryReport,
  MonthlySummaryReport,
} from '../services/pdfReportDataService'
import { FileActionResult } from '../services/fileService'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'
import { TransactionBadge } from '../components/common/TransactionBadges'

export type ReportType =
  | 'customer_statement'
  | 'credit'
  | 'expense'
  | 'sales'
  | 'inventory'
  | 'daily'
  | 'monthly'

export function ReportsScreen({
  customers,
  expenses: _expenses,
  purchases: _purchases,
  onMenuOpen,
  routeNames,
}: {
  customers: Record<string, Customer>
  expenses?: Expense[]
  purchases?: EggPurchase[]
  onMenuOpen: () => void
  routeNames?: Record<string, string>
}) {
  const customerList = Object.values(customers)
  const [activeReport, setActiveReport] = useState<ReportType>('customer_statement')
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('this_month')

  const [customStartDate, setCustomStartDate] = useState<string>(() => getTodayStr())
  const [customEndDate, setCustomEndDate] = useState<string>(() => getTodayStr())
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customerList.length > 0 ? customerList[0].id : ''
  )
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')

  // Report State
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [statementData, setStatementData] = useState<CustomerStatementReport | null>(null)
  const [creditData, setCreditData] = useState<CreditReport | null>(null)
  const [expenseData, setExpenseData] = useState<ExpenseReport | null>(null)
  const [salesData, setSalesData] = useState<SalesReport | null>(null)
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null)
  const [dailyData, setDailyData] = useState<DailySummaryReport | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlySummaryReport | null>(null)
  const [exportSuccessDetails, setExportSuccessDetails] = useState<FileActionResult | null>(null)

  // Fetch Report Data on Filter / Active Report Change
  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true)
      const range = resolveDateRange(dateFilter, customStartDate, customEndDate, getTodayStr())

      try {
        if (activeReport === 'customer_statement') {
          if (selectedCustomerId) {
            const data = await pdfReportDataService.getCustomerStatement(selectedCustomerId, range)
            setStatementData(data)
          }
        } else if (activeReport === 'credit') {
          const data = await pdfReportDataService.getCreditReport(range, selectedRouteId || undefined)
          setCreditData(data)
        } else if (activeReport === 'expense') {
          const data = await pdfReportDataService.getExpenseReport(range)
          setExpenseData(data)
        } else if (activeReport === 'sales') {
          const data = await pdfReportDataService.getSalesReport(range, selectedRouteId || undefined)
          setSalesData(data)
        } else if (activeReport === 'inventory') {
          const data = await pdfReportDataService.getInventoryReport(range)
          setInventoryData(data)
        } else if (activeReport === 'daily') {
          const data = await pdfReportDataService.getDailySummaryReport(range)
          setDailyData(data)
        } else if (activeReport === 'monthly') {
          const data = await pdfReportDataService.getMonthlySummaryReport(range)
          setMonthlyData(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadReportData()
  }, [activeReport, dateFilter, customStartDate, customEndDate, selectedCustomerId, selectedRouteId, customers])

  // PDF Export Trigger
  const handleExportPdf = async () => {
    try {
      setIsLoading(true)
      const pdfGen = await import('../services/pdfGenerator')
      let res: FileActionResult | undefined
      if (activeReport === 'customer_statement' && statementData) {
        res = await pdfGen.generateCustomerStatementPdf(statementData)
      } else if (activeReport === 'credit' && creditData) {
        res = await pdfGen.generateCreditReportPdf(creditData)
      } else if (activeReport === 'expense' && expenseData) {
        res = await pdfGen.generateExpenseReportPdf(expenseData)
      } else if (activeReport === 'sales' && salesData) {
        res = await pdfGen.generateSalesReportPdf(salesData)
      } else if (activeReport === 'inventory' && inventoryData) {
        res = await pdfGen.generateInventoryReportPdf(inventoryData)
      } else if (activeReport === 'daily' && dailyData) {
        res = await pdfGen.generateDailySummaryPdf(dailyData)
      } else if (activeReport === 'monthly' && monthlyData) {
        res = await pdfGen.generateMonthlySummaryPdf(monthlyData)
      }

      if (res && res.success) {
        setExportSuccessDetails(res)
      } else if (res && !res.success) {
        alert(`Export Failed: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Export Error: ${err?.message || 'Unable to generate PDF report.'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 active:bg-gray-200"
          >
            <IconMenu />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900 leading-tight">Reports</h1>
            <p className="text-xs text-gray-500 font-semibold">Sales, profit & customer PDF statements</p>
          </div>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 active:scale-95 transition-transform disabled:opacity-50"
        >
          <span>📄 Export PDF</span>
        </button>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar">
        {[
          { id: 'customer_statement', label: '1. Customer Statement' },
          { id: 'credit', label: '2. Credit Report' },
          { id: 'expense', label: '3. Expense Report' },
          { id: 'sales', label: '4. Sales Report' },
          { id: 'inventory', label: '5. Inventory Report' },
          { id: 'daily', label: '6. Daily Summary' },
          { id: 'monthly', label: '7. Monthly Summary' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeReport === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filter & Options Bar */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as DateFilterOption)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  dateFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Customer / Route Selectors */}
          <div className="flex items-center gap-2">
            {activeReport === 'customer_statement' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-600">Customer:</span>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 max-w-[180px] truncate focus:ring-1 focus:ring-slate-900"
                >
                  {customerList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(activeReport === 'credit' || activeReport === 'sales') && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-600">Route:</span>
                <select
                  value={selectedRouteId}
                  onChange={e => setSelectedRouteId(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 max-w-[150px] truncate focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All Routes</option>
                  {routeNames &&
                    Object.entries(routeNames).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Picker Bar */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-gray-600">Querying SQLite Database...</p>
          </div>
        ) : (
          <>
            {/* 1. CUSTOMER STATEMENT PREVIEW */}
            {activeReport === 'customer_statement' && statementData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900">
                        {statementData.customer.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Route: {statementData.routeName}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {statementData.dateRange.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-500 text-[10px] block font-semibold">Opening Balance</span>
                      <span className="text-base font-bold text-gray-800 mt-0.5 block">
                        {fmtCurrency(statementData.openingBalance)}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-500 text-[10px] block font-semibold">Total Sales (Billed)</span>
                      <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                        {fmtCurrency(statementData.totalBilled)}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-500 text-[10px] block font-semibold">Total Paid</span>
                      <span className="text-base font-bold text-blue-600 mt-0.5 block">
                        {fmtCurrency(statementData.totalPaid)}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-500 text-[10px] block font-semibold">Closing Balance</span>
                      <span className="text-base font-bold text-red-600 mt-0.5 block">
                        {fmtCurrency(statementData.closingBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Chronological Ledger Preview
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-center">Egg Qty</th>
                          <th className="p-2.5 text-right">Sale (₹)</th>
                          <th className="p-2.5 text-right">Paid (₹)</th>
                          <th className="p-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {statementData.ledger.map((item, idx) => {
                          const txLike = { type: item.type, amountToBePaid: item.debit, amountPaid: item.credit }
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-2.5 font-medium text-gray-800">{fmtDate(item.date)}</td>
                              <td className="p-2.5 font-bold">
                                <TransactionBadge tx={txLike} />
                              </td>
                            <td className="p-2.5 text-gray-900">{item.description}</td>
                            <td className="p-2.5 text-center text-gray-600 font-medium">
                              {item.totalEggs > 0 ? `${item.totalEggs} eggs` : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">
                              {item.debit > 0 ? fmtCurrency(item.debit) : '-'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-blue-600">
                              {item.credit > 0 ? fmtCurrency(item.credit) : '-'}
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-gray-900">
                              {fmtCurrency(item.runningBalance)}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CREDIT REPORT PREVIEW */}
            {activeReport === 'credit' && creditData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Credit Report Summary</h3>
                    <p className="text-xs text-gray-500 font-medium">Scope: {creditData.routeFilterName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-medium">Total Credit</span>
                    <span className="text-xl font-extrabold text-red-600">
                      {fmtCurrency(creditData.totalOutstandingCredit)}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5 text-center">#</th>
                          <th className="p-2.5">Customer Name</th>
                          <th className="p-2.5">Route</th>
                          <th className="p-2.5">Last Tx</th>
                          <th className="p-2.5 text-right">Sales</th>
                          <th className="p-2.5 text-right">Paid</th>
                          <th className="p-2.5 text-right">Outstanding Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {creditData.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-gray-900">{item.customerName}</td>
                            <td className="p-2.5 text-gray-600">{item.routeName}</td>
                            <td className="p-2.5 text-gray-500">{fmtDate(item.lastTransactionDate)}</td>
                            <td className="p-2.5 text-right font-medium">{fmtCurrency(item.totalSales)}</td>
                            <td className="p-2.5 text-right font-medium">{fmtCurrency(item.totalPaid)}</td>
                            <td className="p-2.5 text-right font-extrabold text-red-600">
                              {fmtCurrency(item.outstandingCredit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EXPENSE REPORT PREVIEW */}
            {activeReport === 'expense' && expenseData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Expense Report Summary</h3>
                    <p className="text-xs text-gray-500 font-medium">Entries: {expenseData.totalCount} records</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-medium">Total Expenses</span>
                    <span className="text-xl font-extrabold text-amber-900">
                      {fmtCurrency(expenseData.totalExpenses)}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Category Breakdown
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5">Category / Purpose</th>
                          <th className="p-2.5 text-center">Count</th>
                          <th className="p-2.5 text-right">Total Amount</th>
                          <th className="p-2.5 text-right">% Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenseData.categoryBreakdown.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 font-bold text-gray-900">{cat.category}</td>
                            <td className="p-2.5 text-center text-gray-600">{cat.count}</td>
                            <td className="p-2.5 text-right font-bold text-gray-900">{fmtCurrency(cat.amount)}</td>
                            <td className="p-2.5 text-right text-gray-500 font-medium">{cat.percentage.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SALES REPORT PREVIEW */}
            {activeReport === 'sales' && salesData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-base font-extrabold text-gray-900">Sales & Distribution Summary</h3>
                    <span className="text-xs text-gray-500 font-medium">{salesData.routeFilterName}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Total Revenue</span>
                      <span className="text-base font-bold text-emerald-600 block">{fmtCurrency(salesData.totalSales)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Trays / Eggs Sold</span>
                      <span className="text-base font-bold text-gray-900 block">{salesData.totalTraysSold} Trays ({salesData.totalEggsSold} eggs)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Amount Paid</span>
                      <span className="text-base font-bold text-blue-600 block">{fmtCurrency(salesData.totalPaid)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Credit Added</span>
                      <span className="text-base font-bold text-red-600 block">{fmtCurrency(salesData.creditAdded)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Sales Transactions Log ({salesData.transactions.length} Records)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5 text-center">#</th>
                          <th className="p-2.5">Date & Time</th>
                          <th className="p-2.5">Customer Name</th>
                          <th className="p-2.5">Route</th>
                          <th className="p-2.5 text-center">Egg Qty</th>
                          <th className="p-2.5 text-right">Rate/100</th>
                          <th className="p-2.5 text-right">Sale Amount</th>
                          <th className="p-2.5 text-right">Amount Paid</th>
                          <th className="p-2.5 text-right">Credit Given</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salesData.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 text-gray-600 font-medium">{fmtDate(tx.date)} {tx.time}</td>
                            <td className="p-2.5 font-bold text-gray-900">{tx.customerName}</td>
                            <td className="p-2.5 text-gray-600">{tx.routeName}</td>
                            <td className="p-2.5 text-center text-gray-700 font-semibold">{tx.totalEggs} eggs ({tx.trays} trays)</td>
                            <td className="p-2.5 text-right font-medium text-gray-700">₹{tx.ratePer100.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">{fmtCurrency(tx.amountBilled)}</td>
                            <td className="p-2.5 text-right font-bold text-blue-600">{fmtCurrency(tx.amountPaid)}</td>
                            <td className="p-2.5 text-right font-bold text-red-600">{fmtCurrency(tx.creditKept)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. INVENTORY REPORT PREVIEW */}
            {activeReport === 'inventory' && inventoryData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
                  <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-2">
                    Inventory & Stock Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Purchased Stock</span>
                      <span className="text-base font-bold text-amber-900 block">{inventoryData.totalPurchasesTrays} Trays ({inventoryData.totalPurchasesEggs} eggs)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Purchase Cost</span>
                      <span className="text-base font-bold text-amber-900 block">{fmtCurrency(inventoryData.totalPurchasesCost)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Trays Sold</span>
                      <span className="text-base font-bold text-emerald-600 block">{inventoryData.totalSalesTrays} Trays ({inventoryData.totalSalesEggs} eggs)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Net Movement</span>
                      <span className="text-base font-bold text-gray-900 block">{inventoryData.netStockChangeTrays} Trays</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Stock Purchase Entries ({inventoryData.purchases.length} Records)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5 text-center">#</th>
                          <th className="p-2.5">Date & Time</th>
                          <th className="p-2.5">Egg Type</th>
                          <th className="p-2.5 text-center">Quantity</th>
                          <th className="p-2.5 text-right">Rate / 100</th>
                          <th className="p-2.5 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {inventoryData.purchases.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 text-gray-600 font-medium">{fmtDate(p.date)} {p.time}</td>
                            <td className="p-2.5 font-bold text-gray-900">{p.eggType}</td>
                            <td className="p-2.5 text-center text-gray-700 font-semibold">{p.trays} Trays ({p.totalEggs} eggs)</td>
                            <td className="p-2.5 text-right font-medium text-gray-700">₹{p.ratePer100.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-bold text-amber-900">{fmtCurrency(p.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. DAILY SUMMARY PREVIEW */}
            {activeReport === 'daily' && dailyData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
                  <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-2">
                    Daily Operational Summary ({fmtDate(dailyData.selectedDate)})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Total Sales</span>
                      <span className="text-base font-bold text-emerald-600 block">{fmtCurrency(dailyData.totalSales)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Payments Received</span>
                      <span className="text-base font-bold text-blue-600 block">{fmtCurrency(dailyData.totalPayments)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Credit Given</span>
                      <span className="text-base font-bold text-red-600 block">{fmtCurrency(dailyData.creditAdded)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Eggs Sold</span>
                      <span className="text-base font-bold text-gray-900 block">{dailyData.totalEggsSold} eggs ({dailyData.totalTraysSold} trays)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Customers Served</span>
                      <span className="text-base font-bold text-gray-900 block">{dailyData.customersServedCount} Customers</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Stock Purchases</span>
                      <span className="text-base font-bold text-amber-900 block">{fmtCurrency(dailyData.totalPurchases)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Expenses</span>
                      <span className="text-base font-bold text-amber-800 block">{fmtCurrency(dailyData.totalExpenses)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Gross Profit</span>
                      <span className="text-base font-bold text-emerald-700 block">{fmtCurrency(dailyData.grossProfit)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Net Profit</span>
                      <span className="text-base font-bold text-slate-900 block">{fmtCurrency(dailyData.netProfit)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Remaining Stock</span>
                      <span className="text-base font-bold text-gray-900 block">{dailyData.remainingInventoryEggs} eggs ({dailyData.remainingInventoryTrays} trays)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Daily Transactions Log ({dailyData.transactions.length} Records)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5 text-center">#</th>
                          <th className="p-2.5">Time</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5 text-center">Eggs</th>
                          <th className="p-2.5 text-right">Billed</th>
                          <th className="p-2.5 text-right">Paid</th>
                          <th className="p-2.5 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dailyData.transactions.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 text-gray-600">{tx.time}</td>
                            <td className="p-2.5 font-bold text-gray-900">{tx.customerName}</td>
                            <td className="p-2.5 text-center text-gray-700 font-semibold">{tx.totalEggs} eggs</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">{fmtCurrency(tx.amountBilled)}</td>
                            <td className="p-2.5 text-right font-bold text-blue-600">{fmtCurrency(tx.amountPaid)}</td>
                            <td className="p-2.5 text-right font-bold text-red-600">{fmtCurrency(tx.creditKept)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 7. MONTHLY SUMMARY PREVIEW */}
            {activeReport === 'monthly' && monthlyData && (
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col gap-3">
                  <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-2">
                    Monthly Business Summary ({monthlyData.selectedMonth})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Monthly Sales</span>
                      <span className="text-base font-bold text-emerald-600 block">{fmtCurrency(monthlyData.totalSales)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Total Payments</span>
                      <span className="text-base font-bold text-blue-600 block">{fmtCurrency(monthlyData.totalPayments)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Outstanding Credit</span>
                      <span className="text-base font-bold text-red-600 block">{fmtCurrency(monthlyData.outstandingCredit)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Eggs Sold</span>
                      <span className="text-base font-bold text-gray-900 block">{monthlyData.totalEggsSold} eggs ({monthlyData.totalTraysSold} trays)</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Purchases</span>
                      <span className="text-base font-bold text-amber-900 block">{fmtCurrency(monthlyData.totalPurchases)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Expenses</span>
                      <span className="text-base font-bold text-amber-800 block">{fmtCurrency(monthlyData.totalExpenses)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Gross Profit</span>
                      <span className="text-base font-bold text-emerald-700 block">{fmtCurrency(monthlyData.grossProfit)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-500 text-[10px] block font-semibold">Net Profit</span>
                      <span className="text-base font-bold text-slate-900 block">{fmtCurrency(monthlyData.netProfit)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-bold text-xs text-gray-800">
                    Day-by-Day Financial Breakdown ({monthlyData.dailyBreakdowns.length} Days)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-center">Trays Sold</th>
                          <th className="p-2.5 text-right">Daily Sales</th>
                          <th className="p-2.5 text-right">Payments</th>
                          <th className="p-2.5 text-right">Credit</th>
                          <th className="p-2.5 text-right">Purchases</th>
                          <th className="p-2.5 text-right">Expenses</th>
                          <th className="p-2.5 text-right">Gross Profit</th>
                          <th className="p-2.5 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthlyData.dailyBreakdowns.map((d, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2.5 font-medium text-gray-800">{fmtDate(d.date)}</td>
                            <td className="p-2.5 text-center text-gray-700 font-semibold">{d.traysSold} trays</td>
                            <td className="p-2.5 text-right font-bold text-emerald-600">{fmtCurrency(d.sales)}</td>
                            <td className="p-2.5 text-right font-bold text-blue-600">{fmtCurrency(d.payments)}</td>
                            <td className="p-2.5 text-right font-bold text-red-600">{fmtCurrency(d.creditAdded)}</td>
                            <td className="p-2.5 text-right font-bold text-amber-900">{fmtCurrency(d.purchases)}</td>
                            <td className="p-2.5 text-right font-bold text-amber-800">{fmtCurrency(d.expenses)}</td>
                            <td className="p-2.5 text-right font-extrabold text-emerald-700">{fmtCurrency(d.grossProfit)}</td>
                            <td className="p-2.5 text-right font-extrabold text-slate-900">{fmtCurrency(d.netProfit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ExportSuccessModal details={exportSuccessDetails} onClose={() => setExportSuccessDetails(null)} />
    </div>
  )
}
