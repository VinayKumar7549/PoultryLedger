import { useState } from "react"
import { DateFilterOption } from "../../services/pdfReportDataService"
import { getTodayStr } from "../../utils/date"

export function DateFilterPicker({
  isOpen,
  onClose,
  onConfirm,
  title = "Select Report Date Range",
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (
    filter: DateFilterOption,
    customStart?: string,
    customEnd?: string,
  ) => void
  title?: string
}) {
  const [filter, setFilter] = useState<DateFilterOption>("this_month")
  const [customStart, setCustomStart] = useState<string>(() => getTodayStr())
  const [customEnd, setCustomEnd] = useState<string>(() => getTodayStr())

  if (!isOpen) return null

  const filterOptions: { id: DateFilterOption; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "last_7_days", label: "Last 7 Days" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom Date Range" },
  ]

  const handleGenerate = () => {
    onConfirm(
      filter,
      filter === "custom" ? customStart : undefined,
      filter === "custom" ? customEnd : undefined,
    )
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Options grid */}
        <div className="flex flex-col gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                filter === opt.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <span>{opt.label}</span>
              {filter === opt.id && <span>✓</span>}
            </button>
          ))}
        </div>

        {/* Custom date range pickers */}
        {filter === "custom" && (
          <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-600">
                Start Date:
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-600">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 active:scale-98 transition-transform shadow-sm"
          >
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
