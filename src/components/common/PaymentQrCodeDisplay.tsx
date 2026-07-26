import { useState } from 'react'
import { businessProfileService } from '../../services/businessProfileService'
import { BusinessProfile } from '../../types'

interface PaymentQrCodeDisplayProps {
  businessProfile: BusinessProfile | null
  onProfileUpdated?: (updated: BusinessProfile) => void
  showTitle?: boolean
  compact?: boolean
}

export function PaymentQrCodeDisplay({
  businessProfile,
  onProfileUpdated,
  showTitle = true,
  compact = false,
}: PaymentQrCodeDisplayProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Invalid file format. Please select a PNG, JPEG, or WEBP image.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please select a QR Code image smaller than 5MB.')
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64Str = reader.result as string
      try {
        const updated = await businessProfileService.saveProfile({ paymentQrCode: base64Str })
        if (onProfileUpdated) onProfileUpdated(updated)
      } catch (err) {
        console.error('Failed to save QR code:', err)
        alert('Failed to save QR code image locally.')
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveQrCode = async () => {
    if (window.confirm('Are you sure you want to remove your Payment QR Code?')) {
      try {
        await businessProfileService.deleteQrCode()
        const updated = await businessProfileService.getProfile()
        if (onProfileUpdated) onProfileUpdated(updated)
      } catch (err) {
        console.error('Failed to remove QR code:', err)
      }
    }
  }

  // NO QR CODE CONFIGURED - Friendly Placeholder
  if (!businessProfile?.paymentQrCode) {
    return (
      <div className="mt-2.5 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-xs">
          📷
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-amber-900">No QR Code Added</h4>
          <p className="text-xs font-medium text-amber-700 mt-1 max-w-xs leading-snug">
            Upload your UPI QR Code once. Customers can scan it whenever Online payment is selected.
          </p>
        </div>

        <label className="cursor-pointer px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 mt-1">
          <span>{isUploading ? 'Uploading...' : 'Upload QR Code'}</span>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>
    )
  }

  // QR CODE CONFIGURED - Centered Large Scan Display
  return (
    <div className={`mt-2.5 ${compact ? 'p-3' : 'p-4'} bg-emerald-50/90 border border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-center gap-3 animate-fadeIn w-full`}>
      {showTitle && (
        <span className="text-sm font-extrabold text-emerald-900 tracking-tight">
          Online Payment QR Code
        </span>
      )}

      {/* Centered Large Scan Container */}
      <div
        onClick={() => setShowPreviewModal(true)}
        className="p-4 bg-white rounded-3xl border border-emerald-200 shadow-lg flex flex-col items-center cursor-pointer hover:shadow-xl transition-all active:scale-98 w-full max-w-sm"
      >
        <img
          src={businessProfile.paymentQrCode}
          alt="UPI Payment QR Code"
          className={`${compact ? 'w-64 h-64 sm:w-72 sm:h-72' : 'w-72 h-72 sm:w-80 sm:h-80'} object-contain rounded-2xl bg-white`}
        />
        <div className="mt-3 text-center w-full">
          <span className="text-sm font-black text-gray-900 uppercase tracking-wider block">
            Scan to Pay
          </span>
          {businessProfile.businessName && (
            <span className="text-xs font-bold text-emerald-700 block mt-0.5">
              {businessProfile.businessName}
            </span>
          )}
          <span className="text-[11px] font-semibold text-gray-400 block mt-1">
            🔍 Tap QR Code for Full Screen Scanner View
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-1">
        <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all">
          <span>Replace QR</span>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>

        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all"
        >
          Full Screen
        </button>

        <button
          type="button"
          onClick={handleRemoveQrCode}
          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold text-xs rounded-xl border border-red-200/60 transition-all"
        >
          Remove
        </button>
      </div>

      {/* Fullscreen Preview Scanner Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col items-center gap-4 shadow-2xl border border-emerald-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between w-full border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">Customer Scanner View</h3>
                <p className="text-xs font-semibold text-emerald-700">Large high-contrast display for scanning</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 text-base"
              >
                ✕
              </button>
            </div>

            {/* Giant Full Visibility Scanner Card */}
            <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center justify-center w-full">
              <img
                src={businessProfile.paymentQrCode}
                alt="Full Preview Payment QR"
                className="w-full h-80 sm:h-96 max-h-[60vh] object-contain rounded-2xl bg-white"
              />
              <div className="mt-4 text-center">
                <span className="text-base font-black text-gray-900 uppercase tracking-wider block">
                  Scan to Pay
                </span>
                {businessProfile.businessName && (
                  <span className="text-sm font-bold text-emerald-700 block mt-1">
                    {businessProfile.businessName}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
