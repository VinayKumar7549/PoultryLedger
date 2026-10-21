export const fmtCurrency = (n: number): string => {
  if (n === undefined || n === null || isNaN(n)) return "₹0"
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  if (Number.isInteger(abs)) {
    return `${sign}₹${abs.toLocaleString("en-IN")}`
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Strict ASCII Currency Formatter for Native PDF Engine
 * Formats numbers as 'Rs. 1,23,456.00' or '-Rs. 1,23,456.00' using pure ASCII digits and standard spaces.
 * Eliminates all Unicode non-breaking spaces (\u00A0, \u202F) and missing glyph bugs (₹).
 */
export const fmtPdfCurrency = (n: number): string => {
  if (n === undefined || n === null || isNaN(n)) return "Rs. 0.00"
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  const str = abs
    .toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/[\u00A0\u202F]/g, " ")
  return `${sign}Rs. ${str}`
}

export const fmtTrays = (n: number): string => {
  if (n === undefined || n === null || isNaN(n) || n === 0) return "0 trays"
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  const val = Number.isInteger(abs) ? abs : Math.round(abs * 100) / 100
  return `${sign}${val} ${val === 1 ? "tray" : "trays"}`
}

export function formatPaymentMethodText(method?: string, amountPaid?: number): string {
  if (amountPaid !== undefined && amountPaid <= 0) {
    return '-'
  }
  if (!method) return 'Cash'
  const m = method.toLowerCase().trim()
  if (m === 'cash') {
    return 'Cash'
  }
  return 'Online'
}
