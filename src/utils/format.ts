export const fmtCurrency = (n: number): string => {
  if (n === undefined || n === null || isNaN(n)) return '₹0'
  const abs = Math.abs(n)
  if (Number.isInteger(abs)) {
    return `₹${abs.toLocaleString('en-IN')}`
  }
  return `₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const fmtTrays = (n: number): string => {
  if (n === undefined || n === null || isNaN(n) || n <= 0) return '0 trays'
  const val = Number.isInteger(n)
    ? n
    : Math.round(n * 100) / 100
  return `${val} ${val === 1 ? 'tray' : 'trays'}`
}
