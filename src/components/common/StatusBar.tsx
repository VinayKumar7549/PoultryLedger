export function StatusBar() {
  const now = new Date()
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return (
    <div className="flex items-center justify-between px-5 pt-2 pb-1 bg-white" style={{ height: '32px' }}>
      <span className="text-xs font-700" style={{ fontWeight: 700, fontSize: '13px' }}>{time}</span>
      <div className="flex items-center gap-1.5">
        <svg width="15" height="11" viewBox="0 0 15 11" fill="#111827">
          <rect x="0" y="3" width="3" height="8" rx="0.5" />
          <rect x="4" y="2" width="3" height="9" rx="0.5" />
          <rect x="8" y="0" width="3" height="11" rx="0.5" />
          <rect x="12" y="0" width="3" height="11" rx="0.5" opacity="0.3" />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="#111827">
          <rect x="1" y="1" width="12" height="9" rx="1.5" stroke="#111827" strokeWidth="1" fill="none" />
          <rect x="13" y="3.5" width="2" height="4" rx="0.5" fill="#111827" />
          <rect x="2" y="2" width="9" height="7" rx="0.5" fill="#059669" />
        </svg>
      </div>
    </div>
  )
}
