export const toIso = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const shiftDateStr = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return toIso(dt)
}

export const getPrevMonthStr = (monthIsoStr: string): string => {
  const [y, m] = monthIsoStr.split('-').map(Number)
  const dt = new Date(y, m - 2, 1)
  const prevY = dt.getFullYear()
  const prevM = String(dt.getMonth() + 1).padStart(2, '0')
  return `${prevY}-${prevM}`
}

export const today = toIso(new Date())
export const yesterday = shiftDateStr(today, -1)
export const twoDaysAgo = shiftDateStr(today, -2)

export const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const getTime = (): string =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

export const uid = (): string => Math.random().toString(36).slice(2, 9)
