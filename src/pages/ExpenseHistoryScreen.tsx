import { useState, useEffect } from 'react'
import { Expense, PaymentMethod } from '../types'
import { today, shiftDateStr, fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { historyService } from '../services/historyService'
import { SearchBar } from '../components/common/SearchBar'
import { DateFilterPicker } from '../components/common/DateFilterPicker'
import { pdfReportDataService, DateFilterOption, resolveDateRange } from '../services/pdfReportDataService'
import { generateExpenseReportPdf } from '../services/pdfGenerator'
import { FileActionResult } from '../services/fileService'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'
import { PaymentMethodBadge } from '../components/common/TransactionBadges'
import {
  IconMenu,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
  IconEdit,
  IconTrash,
} from '../components/common/Icons'

export function ExpenseHistoryScreen({
  expenses,
  expenseDate,
  setExpenseDate,
  onMenuOpen,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}: {
  expenses: Expense[]
  expenseDate: string
  setExpenseDate: (d: string) => void
  onMenuOpen: () => void
  onAddExpense: () => void
  onUpdateExpense?: (e: Expense) => void
  onDeleteExpense?: (id: string) => void
}) {
  const [dailyData, setDailyData] = useState<{
    expenses: Expense[]
    totalExpenseDay: number
  }>({ expenses: [], totalExpenseDay: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [exportSuccessDetails, setExportSuccessDetails] = useState<FileActionResult | null>(null)

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPurpose, setEditPurpose] = useState('')
  const [editMethod, setEditMethod] = useState<PaymentMethod>('cash')
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  useEffect(() => {
    historyService.getDailyExpenses(expenseDate).then(res => {
      setDailyData(res)
    })
  }, [expenseDate, expenses])

  const handleConfirmDateFilter = async (filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    try {
      const range = resolveDateRange(filter, customStart, customEnd)
      const reportData = await pdfReportDataService.getExpenseReport(range)
      if (reportData) {
        const res = await generateExpenseReportPdf(reportData)
        if (res && res.success) {
          setExportSuccessDetails(res)
        } else if (res && !res.success) {
          alert(`Export Failed: ${res.message}`)
        }
      }
    } catch (err: any) {
      alert(`Export Error: ${err?.message || 'Unable to generate PDF'}`)
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
          <h2 className="text-xl font-extrabold text-gray-900">Expenses</h2>
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
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                  {item.time ? `${item.time} • ` : ''}Paid via <PaymentMethodBadge method={item.paymentMethod} />
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold text-amber-900">
                  {fmtCurrency(item.amount)}
                </span>
                {onUpdateExpense && (
                  <button
                    onClick={() => {
                      setEditingExpense(item)
                      setEditAmount(String(item.amount))
                      setEditPurpose(item.purpose)
                      setEditMethod(item.paymentMethod || 'cash')
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-amber-700 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                    title="Edit Expense"
                  >
                    <IconEdit />
                  </button>
                )}
                {onDeleteExpense && (
                  <button
                    onClick={() => setExpenseToDelete(item)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                    title="Delete Expense"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900">Edit Expense Record</h3>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Expense Purpose / Reason *</label>
                <input
                  type="text"
                  value={editPurpose}
                  onChange={e => setEditPurpose(e.target.value)}
                  placeholder="e.g. Vehicle Fuel, Rent"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Expense Amount (₹) *</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Payment Method</label>
                <select
                  value={editMethod}
                  onChange={e => setEditMethod(e.target.value as PaymentMethod)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingExpense(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amt = parseFloat(editAmount) || 0
                  if (!editPurpose.trim() || amt <= 0 || !onUpdateExpense) return
                  onUpdateExpense({
                    ...editingExpense,
                    purpose: editPurpose.trim(),
                    amount: amt,
                    paymentMethod: editMethod,
                  })
                  setEditingExpense(null)
                }}
                disabled={!editPurpose.trim() || (parseFloat(editAmount) || 0) <= 0}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete Expense</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to delete this expense ({expenseToDelete.purpose} - {fmtCurrency(expenseToDelete.amount)})?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (expenseToDelete && onDeleteExpense) {
                    onDeleteExpense(expenseToDelete.id)
                    setExpenseToDelete(null)
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

      {/* Date Filter Picker Dialog */}
      <DateFilterPicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleConfirmDateFilter}
        title="Expense Report Period"
      />

      <ExportSuccessModal details={exportSuccessDetails} onClose={() => setExportSuccessDetails(null)} />
    </div>
  )
}
