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

export const getTodayStr = (d: Date = new Date()): string => toIso(d)
export const getYesterdayStr = (d: Date = new Date()): string => shiftDateStr(getTodayStr(d), -1)
export const getTwoDaysAgoStr = (d: Date = new Date()): string => shiftDateStr(getTodayStr(d), -2)

export const today = toIso(new Date())
export const yesterday = shiftDateStr(today, -1)
export const twoDaysAgo = shiftDateStr(today, -2)

export const fmtDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const getTime = (d: Date = new Date()): string =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

export const timeTo24h = (timeStr?: string): string => {
  if (!timeStr) return '00:00:00'
  const normalized = timeStr.replace(/[\u202f\u00a0]+/g, ' ').replace(/\./g, '').trim().toUpperCase()
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = match12[2]
    const seconds = match12[3] || '00'
    const period = match12[4]
    if (period === 'PM' && hours < 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
  }
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match24) {
    const hours = String(parseInt(match24[1], 10)).padStart(2, '0')
    const minutes = match24[2]
    const seconds = match24[3] || '00'
    return `${hours}:${minutes}:${seconds}`
  }
  return '00:00:00'
}

export const compareTimestampsAsc = (
  dateA: string = '',
  timeA: string = '',
  dateB: string = '',
  timeB: string = '',
  createdAtA: string = '',
  createdAtB: string = ''
): number => {
  const cmpDate = (dateA || '').localeCompare(dateB || '')
  if (cmpDate !== 0) return cmpDate
  const cmpTime = timeTo24h(timeA).localeCompare(timeTo24h(timeB))
  if (cmpTime !== 0) return cmpTime
  return (createdAtA || '').localeCompare(createdAtB || '')
}

export const compareTimestampsDesc = (
  dateA: string = '',
  timeA: string = '',
  dateB: string = '',
  timeB: string = '',
  createdAtA: string = '',
  createdAtB: string = ''
): number => {
  return compareTimestampsAsc(dateB, timeB, dateA, timeA, createdAtB, createdAtA)
}

export const parseOpeningBalanceTimestamp = (tsStr?: string): { date: string; time: string } => {
  if (!tsStr) {
    return { date: getTodayStr(), time: getTime() }
  }

  const d = new Date(tsStr)
  if (!isNaN(d.getTime())) {
    return {
      date: toIso(d),
      time: getTime(d),
    }
  }

  if (tsStr.includes('T') || tsStr.includes(' ')) {
    const parts = tsStr.split(/[T ]/)
    const date = parts[0] || getTodayStr()
    let rawTime = '00:00'
    if (parts[1]) {
      const cleanTime = parts[1].substring(0, 5)
      const mockDate = new Date(`${date}T${cleanTime}:00`)
      if (!isNaN(mockDate.getTime())) {
        rawTime = getTime(mockDate)
      } else {
        rawTime = cleanTime
      }
    }
    return { date, time: rawTime }
  }

  if (tsStr.length >= 10) {
    return { date: tsStr.substring(0, 10), time: getTime() }
  }

  return { date: getTodayStr(), time: getTime() }
}

export const uid = (): string => Math.random().toString(36).slice(2, 9)

