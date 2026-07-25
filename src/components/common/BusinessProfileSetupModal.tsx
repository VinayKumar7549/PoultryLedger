import { useState } from 'react'
import { BusinessProfile } from '../../types'

export function BusinessProfileSetupModal({
  onSave,
}: {
  onSave: (profile: Partial<BusinessProfile>) => Promise<void>
}) {
  const [businessName, setBusinessName] = useState<string>('')
  const [ownerName, setOwnerName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [businessLogo, setBusinessLogo] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) {
      setError('Business Name is required.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      await onSave({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        businessLogo: businessLogo.trim(),
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to save business profile.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
            🏢
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Welcome to PoultryLedger</h2>
            <p className="text-xs text-gray-500 font-medium">Configure your business profile to get started</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Business Name (Required) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sai Egg Center"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Owner Name (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Owner Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Vinay Kumar"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Phone Number (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Address (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Business Address (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Shop #4, Main Market, City"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          {/* Business Logo URL (Optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Business Logo / Mark (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Image URL or Logo Reference"
              value={businessLogo}
              onChange={e => setBusinessLogo(e.target.value)}
              className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !businessName.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
