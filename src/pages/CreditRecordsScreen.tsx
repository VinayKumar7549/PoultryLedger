import { useState, useEffect } from 'react'
import { Customer } from '../types'
import { fmtDate } from '../utils/date'
import { fmtCurrency } from '../utils/format'
import { creditService, CreditTimelineEntry } from '../services/creditService'
import { SearchBar } from '../components/common/SearchBar'
import { DateFilterPicker } from '../components/common/DateFilterPicker'
import { pdfReportDataService, DateFilterOption, resolveDateRange } from '../services/pdfReportDataService'
import { generateCustomerStatementPdf, generateCreditReportPdf } from '../services/pdfGenerator'
import { FileActionResult } from '../services/fileService'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'
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
  routeNames,
}: {
  customers: Record<string, Customer>
  routeCustomerMap: Record<string, string[]>
  onMenuOpen: () => void
  routeNames?: Record<string, string>
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [exportSuccessDetails, setExportSuccessDetails] = useState<FileActionResult | null>(null)
  const [historyEntries, setHistoryEntries] = useState<CreditTimelineEntry[]>([])
  const [totalSystemCredit, setTotalSystemCredit] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Date filter picker modal state
  const [pickerState, setPickerState] = useState<{
    open: boolean
    mode: 'customer' | 'credit'
  }>({ open: false, mode: 'customer' })

  const selectedCustomer = selectedCustomerId ? customers[selectedCustomerId] : null

  useEffect(() => {
    creditService.getTotalSystemCredit().then(setTotalSystemCredit)
  }, [customers])

  useEffect(() => {
    if (selectedCustomer) {
      creditService
        .getCustomerCreditHistory(selectedCustomer.id, selectedCustomer.outstandingCredit)
        .then(entries => setHistoryEntries(entries))
    }
  }, [selectedCustomerId, selectedCustomer?.outstandingCredit])

  const handleConfirmDateFilter = async (filter: DateFilterOption, customStart?: string, customEnd?: string) => {
    try {
      const range = resolveDateRange(filter, customStart, customEnd)
      let res: FileActionResult | undefined
      if (pickerState.mode === 'customer' && selectedCustomer) {
        const data = await pdfReportDataService.getCustomerStatement(selectedCustomer.id, range)
        if (data) {
          res = await generateCustomerStatementPdf(data)
        }
      } else if (pickerState.mode === 'credit') {
        const data = await pdfReportDataService.getCreditReport(range)
        if (data) {
          res = await generateCreditReportPdf(data)
        }
      }

      if (res && res.success) {
        setExportSuccessDetails(res)
      } else if (res && !res.success) {
        alert(`Export Failed: ${res.message}`)
      }
    } catch (err: any) {
      alert(`Export Error: ${err?.message || 'Unable to generate PDF'}`)
    }
  }

  // If viewing a specific customer's Credit History
  if (selectedCustomer) {
    return (
      <div className="flex flex-col h-full bg-white relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
              style={{ color: '#111827' }}
            >
              <IconBack />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-extrabold text-gray-900 truncate">
                {selectedCustomer.name}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                Credit History & Ledger
              </p>
            </div>
          </div>

          <button
            onClick={() => setPickerState({ open: true, mode: 'customer' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 active:scale-95 transition-transform"
          >
            <span>📄 Statement PDF</span>
          </button>
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
              <p className="text-xs font-semibold" style={{ color: selectedCustomer.outstandingCredit > 0 ? '#991b1b' : '#166534' }}>
                Current Outstanding Credit
              </p>
              <p className="text-2xl font-extrabold mt-0.5" style={{ color: selectedCustomer.outstandingCredit > 0 ? '#dc2626' : '#059669' }}>
                {fmtCurrency(selectedCustomer.outstandingCredit)}
              </p>
            </div>
            <span
              className="text-xs font-bold px-3.5 py-1.5 rounded-full"
              style={{
                background: selectedCustomer.outstandingCredit > 0 ? '#fee2e2' : '#d1fae5',
                color: selectedCustomer.outstandingCredit > 0 ? '#dc2626' : '#065f46',
              }}
            >
              {selectedCustomer.outstandingCredit > 0 ? 'Outstanding' : 'Cleared'}
            </span>
          </div>

          {/* Timeline of credit history */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-bold text-gray-700">
              Transaction & Credit Timeline
            </p>

            {historyEntries.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No transaction history found.</p>
            ) : (
              historyEntries.map(entry => {
                const { tx, creditAdded, creditReduced, updatedOutstanding } = entry
                const isPayment = tx.type === 'payment' || (tx.trays === 0 && tx.amountToBePaid === 0)

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPayment ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                        <p className="text-xs font-bold text-gray-900">
                          {isPayment ? 'Payment Received' : `Egg Sale (${tx.trays} Trays)`}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-500">
                        {fmtDate(tx.date)} {tx.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                      <div>
                        <span className="text-gray-500">Prior Bal: </span>
                        <span className="font-semibold text-gray-700">{fmtCurrency(runningOutstanding)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid: </span>
                        <span className="font-bold text-emerald-600">{fmtCurrency(tx.amountPaid)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {creditAdded > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-red-100 text-red-700">
                          + {fmtCurrency(creditAdded)} Credit Added
                        </span>
                      )}
                      {creditReduced > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800">
                          - {fmtCurrency(creditReduced)} Credit Reduced
                        </span>
                      )}
                      {creditAdded === 0 && creditReduced === 0 && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-gray-200 text-gray-700">
                          No Credit Change
                        </span>
                      )}

                      <div className="text-right">
                        <span className="text-xs text-gray-500">Outstanding After: </span>
                        <span className="text-sm font-extrabold" style={{ color: updatedOutstanding > 0 ? '#dc2626' : '#059669' }}>
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

        {/* Date Filter Picker Dialog */}
        <DateFilterPicker
          isOpen={pickerState.open}
          onClose={() => setPickerState(s => ({ ...s, open: false }))}
          onConfirm={handleConfirmDateFilter}
          title={pickerState.mode === 'customer' ? 'Customer Statement Period' : 'Credit Report Period'}
        />
      </div>
    )
  }

  // Otherwise render Overview Screen of all Customer Credit Cards grouped by Route
  const routeIds = Object.keys(routeCustomerMap)

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: '#111827' }}>
            <IconMenu />
          </button>
          <h2 className="text-xl font-extrabold text-gray-900">Credit Records</h2>
        </div>

        <button
          onClick={() => setPickerState({ open: true, mode: 'credit' })}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 active:scale-95 transition-transform"
        >
          <span>📄 Export PDF</span>
        </button>
      </div>

      {/* System total outstanding credit banner */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: '#fff5f5', border: '1.5px solid #fecaca' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#991b1b' }}>Total Outstanding Credit</p>
            <p className="text-2xl font-extrabold mt-0.5" style={{ color: '#dc2626' }}>
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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search customer name or shop..."
        />

        {routeIds.map(rId => {
          const rName = routeNames?.[rId] || 'General Route'
          const cIds = routeCustomerMap[rId] || []
          const matchingCustomers = cIds
            .map(id => customers[id])
            .filter(Boolean)
            .filter(c => {
              if (!searchQuery.trim()) return true
              const q = searchQuery.toLowerCase().trim()
              return c.name.toLowerCase().includes(q) || (c.subtitle && c.subtitle.toLowerCase().includes(q))
            })

          if (matchingCustomers.length === 0) return null

          return (
            <div key={rId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Route: {rName} ({matchingCustomers.length})
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {matchingCustomers.map(cust => (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className="p-4 rounded-2xl border border-gray-100 bg-white shadow-xs hover:bg-gray-50 flex items-center justify-between text-left transition-all active:scale-98"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{cust.name}</p>
                      {cust.subtitle && <p className="text-xs text-gray-500">{cust.subtitle}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400 font-medium">Outstanding</p>
                        <p className="text-sm font-extrabold" style={{ color: cust.outstandingCredit > 0 ? '#dc2626' : '#059669' }}>
                          {fmtCurrency(cust.outstandingCredit)}
                        </p>
                      </div>
                      <div className="text-gray-400">
                        <IconChevronRight />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Date Filter Picker Dialog */}
      <DateFilterPicker
        isOpen={pickerState.open}
        onClose={() => setPickerState(s => ({ ...s, open: false }))}
        onConfirm={handleConfirmDateFilter}
        title={pickerState.mode === 'customer' ? 'Customer Statement Period' : 'Credit Report Period'}
      />

      <ExportSuccessModal details={exportSuccessDetails} onClose={() => setExportSuccessDetails(null)} />
    </div>
  )
}
