import { useState, useRef, useEffect } from 'react'
import { EggType } from '../../types'
import { IconCheck } from './Icons'

export function CustomEggTypeSelect({
  value,
  onChange,
}: {
  value: EggType
  onChange: (val: EggType) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const options: { id: EggType; label: string }[] = [
    { id: 'normal', label: 'Normal Eggs' },
    { id: 'damaged', label: 'Damaged Eggs' },
  ]

  const selectedOption = options.find(o => o.id === value) || options[0]

  return (
    <div className="relative" ref={menuRef}>
      <label className="text-xs font-600 mb-1.5 block" style={{ color: '#6b7280', fontWeight: 600 }}>
        Egg Type
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white flex items-center justify-between active:scale-98 transition-transform"
        style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
      >
        <span>{selectedOption.label}</span>
        <div style={{ color: '#6b7280', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl p-1.5 shadow-xl border flex flex-col gap-1 animate-fade-in"
          style={{ borderColor: '#e5e7eb', boxShadow: '0 12px 28px rgba(0,0,0,0.15)' }}
        >
          {options.map(opt => {
            const isSelected = opt.id === value
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}
                className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-700 flex items-center justify-between transition-colors active:scale-98"
                style={{
                  background: isSelected ? '#d1fae5' : 'transparent',
                  color: isSelected ? '#059669' : '#374151',
                  fontWeight: 700,
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span style={{ color: '#059669' }}>
                    <IconCheck />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
