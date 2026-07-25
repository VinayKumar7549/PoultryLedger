import { useState, useEffect } from 'react'
import { Expense } from '../types'
import { today, shiftDateStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { historyService } from '../services/historyService'
import { SearchBar } from '../components/common/SearchBar'
import { DateFilterPicker } from '../components/common/DateFilterPicker'
import { pdfReportDataService, DateFilterOption, resolveDateRange } from '../services/pdfReportDataService'
import { generateExpenseReportPdf } from '../services/pdfGenerator'
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
  const [dailyData, setDailyData] = useState<{
    expenses: Expense[]
    totalExpenseDay: number
  }>({ expenses: [], totalExpenseDay: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    historyService.getDailyExpenses(expenseDate).then(res => {
      setDailyData(res)
    })
  }, [expenseDate, expenses])

  const handleConfirmDateFilter = async (filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    const range = resolveDateRange(filter, customStart, customEnd)
    const reportData = await pdfReportDataService.getExpenseReport(range)
    if (reportData) {
      await generateExpenseReportPdf(reportData)
    }
  }

  const dayExpenses = dailyData.expenses
  const totalExpenseDay = dailyData.totalExpenseDay

  const filteredExpenses = dayExpenses.filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const purposeMatch = (item.purpose || '').toLowerCase().includes(q)
    const methodMatch = (item.paymentMethod || '').toLowerCase().includes(q)
    const amountMatch = String(item.amount).includes(q)
    return purposeMatch || methodMatch || amountMatch
  })

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-extrabold text-gray-900">Expense History</h2>
        </div>

        <button
          onClick={() => setShowDatePicker(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 active:scale-95 transition-transform"
        >
          <span>📄 Export PDF</span>
        </button>
      </div>

      {/* Date Selector bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button
          onClick={() => setExpenseDate(shiftDateStr(expenseDate, -1))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 text-gray-700"
        >
          <IconChevronLeft />
        </button>

        <div className="flex items-center gap-2">
          <IconCalendar />
          <input
            type="date"
            value={expenseDate}
            onChange={e => setExpenseDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
          />
          {expenseDate === today && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Today
            </span>
          )}
        </div>

        <button
          onClick={() => setExpenseDate(shiftDateStr(expenseDate, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 text-gray-700"
        >
          <IconChevronRight />
        </button>
      </div>

      {/* Daily Total Summary Card */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 flex items-center justify-between bg-amber-50 border border-amber-200">
          <div>
            <p className="text-xs font-semibold text-amber-800">Expenses for {fmtDate(expenseDate)}</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-0.5">
              {fmtCurrency(totalExpenseDay)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-800">
            <IconWallet />
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search purpose or amount..."
          />
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <IconWallet />
            <p className="text-sm font-semibold mt-2">No expenses recorded for this date.</p>
          </div>
        ) : (
          filteredExpenses.map(item => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border border-gray-100 bg-white shadow-xs flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-extrabold text-gray-900">{item.purpose}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.time || ''} • Paid via {item.paymentMethod.toUpperCase()}
                </p>
              </div>

              <span className="text-base font-extrabold text-amber-900">
                {fmtCurrency(item.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Expense Button */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={onAddExpense}
          className="w-full py-3.5 rounded-2xl bg-amber-600 text-white text-sm font-bold shadow-md hover:bg-amber-700 active:scale-98 transition-transform"
        >
          + Add New Expense
        </button>
      </div>

      {/* Date Filter Picker Dialog */}
      <DateFilterPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleConfirmDateFilter}
        title="Expense Report Period"
      />
    </div>
  )
}
