import React from 'react'
import { IconSearch, IconClose } from './Icons'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
        <IconSearch />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-gray-50 text-sm font-600 rounded-xl border border-gray-200 outline-none focus:bg-white focus:border-emerald-500 transition-colors"
        style={{ fontWeight: 600, color: '#111827' }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 p-0.5 rounded-full text-gray-400 hover:text-gray-600 active:scale-90 transition-transform"
        >
          <IconClose />
        </button>
      )}
    </div>
  )
}
