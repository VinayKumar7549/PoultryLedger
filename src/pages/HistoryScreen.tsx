import { useState, useEffect } from 'react'
import { Customer } from '../types'
import { today, shiftDateStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { historyService, DailyTransactionItem } from '../services/historyService'
import { SearchBar } from '../components/common/SearchBar'
import { DateFilterPicker } from '../components/common/DateFilterPicker'
import { pdfReportDataService, DateFilterOption, resolveDateRange } from '../services/pdfReportDataService'
import { generateDailySummaryPdf } from '../services/pdfGenerator'
import { FileActionResult } from '../services/fileService'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'
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
  const [dailyData, setDailyData] = useState<{
    items: DailyTransactionItem[]
    totalSalesDay: number
    totalPaidDay: number
  }>({ items: [], totalSalesDay: 0, totalPaidDay: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccessDetails, setExportSuccessDetails] = useState<FileActionResult | null>(null)

  useEffect(() => {
    historyService.getDailyTransactions(historyDate).then(res => {
      setDailyData(res)
    })
  }, [historyDate, customers])

  // Direct PDF Export for active date & search filter
  const handleExportCurrent = async () => {
    try {
      setIsExporting(true)
      const range = {
        startDate: historyDate,
        endDate: historyDate,
        label: `Daily Transactions (${fmtDate(historyDate)})`,
      }
      const reportData = await pdfReportDataService.getDailySummaryReport(range)
      if (reportData) {
        if (filteredItems.length > 0) {
          reportData.transactions = filteredItems.map(({ tx, customer }) => {
            const trays = Number(tx.trays) || 0
            const totalEggs = Math.round(trays * 30)
            const billed = Number(tx.amountToBePaid) || 0
            const paid = Number(tx.amountPaid) || 0
            const ratePer100 = totalEggs > 0 ? (billed / totalEggs) * 100 : 0
            return {
              date: tx.date,
              time: tx.time || '',
              customerName: customer.name,
              routeName: customer.subtitle || 'General Route',
              trays,
              totalEggs,
              ratePer100,
              amountBilled: billed,
              amountPaid: paid,
              paymentMethod: tx.paymentMethod || 'cash',
              creditKept: Number(tx.creditKeptToday) || 0,
            }
          })
          reportData.totalSales = filteredItems.reduce((sum, { tx }) => sum + (Number(tx.amountToBePaid) || 0), 0)
          reportData.totalPayments = filteredItems.reduce((sum, { tx }) => sum + (Number(tx.amountPaid) || 0), 0)
          reportData.totalTraysSold = filteredItems.reduce((sum, { tx }) => sum + (Number(tx.trays) || 0), 0)
          reportData.totalEggsSold = Math.round(reportData.totalTraysSold * 30)
          reportData.customersServedCount = new Set(filteredItems.map(({ customer }) => customer.name)).size
        }
        const res = await generateDailySummaryPdf(reportData)
        if (res && res.success) {
          setExportSuccessDetails(res)
        } else if (res && !res.success) {
          alert(`Export Failed: ${res.message}`)
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(`Export Failed: ${err?.message || 'Unable to generate PDF'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Export via Date Filter Picker
  const handleConfirmDateFilter = async (filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    try {
      setIsExporting(true)
      const range = resolveDateRange(filter, customStart, customEnd, historyDate)
      const reportData = await pdfReportDataService.getDailySummaryReport(range)
      if (reportData) {
        const res = await generateDailySummaryPdf(reportData)
        if (res && res.success) {
          setExportSuccessDetails(res)
        } else if (res && !res.success) {
          alert(`Export Failed: ${res.message}`)
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(`Export Error: ${err?.message || 'Unable to generate PDF'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const allTxWithCustomer = dailyData.items
  const totalSalesDay = dailyData.totalSalesDay
  const totalPaidDay = dailyData.totalPaidDay

  const filteredItems = allTxWithCustomer.filter(({ tx, customer }) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const nameMatch = (customer.name || '').toLowerCase().includes(q)
    const subtitleMatch = (customer.subtitle || '').toLowerCase().includes(q)
    const dateMatch = (tx.date || '').toLowerCase().includes(q) || fmtDate(tx.date).toLowerCase().includes(q)
    return nameMatch || subtitleMatch || dateMatch
  })

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-extrabold text-gray-900">Sales Register</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrent}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 active:scale-95 transition-transform disabled:opacity-50"
          >
            <span>📄 Export PDF</span>
          </button>
          <button
            onClick={() => setShowDatePicker(true)}
            className="p-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
            title="Select Date Range"
          >
            <IconCalendar />
          </button>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
        <button
          onClick={() => setHistoryDate(shiftDateStr(historyDate, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform hover:bg-gray-50"
          style={{ borderColor: '#e5e7eb', color: '#374151' }}
        >
          <IconChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          <div style={{ color: '#059669' }}>
            <IconCalendar />
          </div>
          <span className="text-sm font-bold text-gray-900">
            {historyDate === today ? 'Today' : fmtDate(historyDate)}
          </span>
        </div>

        <button
          onClick={() => setHistoryDate(shiftDateStr(historyDate, 1))}
          disabled={historyDate === today}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border active:scale-95 transition-transform hover:bg-gray-50 disabled:opacity-40"
          style={{
            borderColor: '#e5e7eb',
            color: historyDate === today ? '#d1d5db' : '#374151',
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
              <p className="text-xs font-semibold" style={{ color: '#065f46' }}>
                Daily Sales ({historyDate === today ? 'Today' : fmtDate(historyDate)})
              </p>
              <p className="text-2xl font-extrabold mt-0.5" style={{ color: '#047857' }}>
                {fmtCurrency(totalSalesDay)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: '#065f46' }}>Total Collected</p>
              <p className="text-lg font-extrabold mt-0.5" style={{ color: '#059669' }}>
                {fmtCurrency(totalPaidDay)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search customer, shop or date..."
        />

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <IconList />
            <p className="text-sm font-semibold mt-2">No transactions for this date.</p>
          </div>
        ) : (
          filteredItems.map(({ tx, customer }) => {
            const isPayment = tx.type === 'payment' || (tx.trays === 0 && tx.amountToBePaid === 0)
            return (
              <div
                key={tx.id}
                className="p-4 rounded-2xl border border-gray-100 bg-white shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">{customer.name}</h3>
                    {customer.subtitle && (
                      <p className="text-xs text-gray-500">{customer.subtitle}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      isPayment ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isPayment ? 'Payment' : 'Sale'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500">
                    {tx.time || ''} {!isPayment && `• ${tx.trays} Trays`}
                  </span>
                  <div className="flex items-center gap-3">
                    {!isPayment && (
                      <span className="font-bold text-gray-900">
                        Billed: {fmtCurrency(tx.amountToBePaid)}
                      </span>
                    )}
                    <span className="font-bold text-emerald-700">
                      Paid: {fmtCurrency(tx.amountPaid)} ({tx.paymentMethod.toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Date Filter Picker Dialog */}
      <DateFilterPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleConfirmDateFilter}
        title="Transactions Report Period"
      />

      <ExportSuccessModal details={exportSuccessDetails} onClose={() => setExportSuccessDetails(null)} />
    </div>
  )
}
