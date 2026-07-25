import { useState, useEffect } from 'react'
import { BusinessProfile } from '../types'
import { businessProfileService } from '../services/businessProfileService'
import { IconMenu } from '../components/common/Icons'

export function BusinessProfileScreen({
  onMenuOpen,
  onProfileUpdated,
}: {
  onMenuOpen: () => void
  onProfileUpdated?: (profile: BusinessProfile) => void
}) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [businessName, setBusinessName] = useState<string>('')
  const [ownerName, setOwnerName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [businessLogo, setBusinessLogo] = useState<string>('')

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const p = await businessProfileService.getProfile()
        setProfile(p)
        setBusinessName(p.businessName || '')
        setOwnerName(p.ownerName || '')
        setPhoneNumber(p.phoneNumber || '')
        setAddress(p.address || '')
        setBusinessLogo(p.businessLogo || '')
      } catch (err) {
        console.error('Error loading business profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) {
      setStatusMessage({ type: 'error', text: 'Business Name cannot be empty.' })
      return
    }

    try {
      setIsSaving(true)
      setStatusMessage(null)

      const updated = await businessProfileService.saveProfile({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        businessLogo: businessLogo.trim(),
      })

      setProfile(updated)
      setStatusMessage({ type: 'success', text: 'Business Profile updated successfully!' })
      if (onProfileUpdated) onProfileUpdated(updated)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to update business profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 active:bg-gray-200"
          >
            <IconMenu />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Business Profile</h1>
            <p className="text-xs text-gray-500 font-medium">SQLite Settings Persistence</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold hover:opacity-75">
              ✕
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold">Loading Profile from SQLite Settings...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-bold">
                🏬
              </div>
              <div>
                <h2 className="text-base font-extrabold text-gray-900">
                  {profile?.businessName || 'Business Profile'}
                </h2>
                <p className="text-xs text-gray-500">
                  Appears in PDF Reports, Invoices, and Backup Filenames
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5">
              {/* Business Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Owner Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Owner Name (Optional)</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Address */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Business Address (Optional)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Business Logo */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Business Logo / Reference (Optional)</label>
                <input
                  type="text"
                  value={businessLogo}
                  onChange={e => setBusinessLogo(e.target.value)}
                  className="px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || !businessName.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
