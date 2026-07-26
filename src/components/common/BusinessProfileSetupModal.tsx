import { useState, useRef } from 'react'
import { BusinessProfile } from '../../types'
import { fileService } from '../../services/fileService'
import { backupService, PoultryLedgerBackup } from '../../services/backupService'
import { IconBrandLogoBadge } from './Icons'

export function BusinessProfileSetupModal({
  onSave,
  onRestoreSuccess,
}: {
  onSave: (profile: Partial<BusinessProfile>) => Promise<void>
  onRestoreSuccess: () => Promise<void>
}) {
  const [mode, setMode] = useState<'choice' | 'form'>('choice')
  const [businessName, setBusinessName] = useState<string>('')
  const [ownerName, setOwnerName] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [businessLogo, setBusinessLogo] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const executeRestore = async (backupContent: PoultryLedgerBackup) => {
    try {
      const validation = backupService.validateBackup(backupContent)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid backup structure.')
      }

      const res = await backupService.restoreBackup(backupContent)
      if (!res.success) {
        throw new Error(res.message)
      }

      await onRestoreSuccess()
    } catch (err: any) {
      setError(err?.message || 'Failed to restore database backup.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRestoreBackup = async () => {
    setError('')
    try {
      if (fileService.isAndroid()) {
        setIsSubmitting(true)
        const res = await fileService.pickBackupJsonFile()
        if (res.cancelled) {
          setIsSubmitting(false)
          return
        }
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Could not read backup file.')
        }
        await executeRestore(res.data)
      } else {
        fileInputRef.current?.click()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to pick backup file.')
      setIsSubmitting(false)
    }
  }

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSubmitting(true)
    setError('')

    const reader = new FileReader()
    reader.onload = async event => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string)
        await executeRestore(jsonContent)
      } catch (err) {
        setError('Failed to parse file. Please upload a valid JSON backup file.')
        setIsSubmitting(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleWebFileChange}
        className="hidden"
      />

      <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl border border-gray-100">
        <div className="flex items-center gap-3">
          <IconBrandLogoBadge size="lg" />
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Welcome to PoultryLedger</h2>
            <p className="text-xs text-gray-500 font-medium">The Smart Ledger for Egg Wholesalers & Distributors</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        {mode === 'choice' ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-gray-900">Choose how to set up your app:</p>
              <p className="text-[11px] text-gray-500">
                Create a new business ledger from scratch, or restore a previous backup file to recover all your data instantly.
              </p>
            </div>

            <button
              onClick={() => setMode('form')}
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>🏢 Create New Business</span>
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={handleRestoreBackup}
              disabled={isSubmitting}
              className="w-full py-4 bg-amber-50 hover:bg-amber-100 border border-amber-300 active:scale-98 text-amber-900 font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>📁 Restore Existing Backup</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-800">Create Business Profile</span>
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="text-[11px] font-bold text-emerald-600 hover:underline"
              >
                ← Back to Options
              </button>
            </div>

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

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !businessName.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Profile...' : 'Save & Get Started'}
              </button>
            </div>
          </form>
        )}

        {isSubmitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-3xl flex items-center justify-center flex-col gap-2">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-gray-800">Processing...</span>
          </div>
        )}
      </div>
    </div>
  )
}
