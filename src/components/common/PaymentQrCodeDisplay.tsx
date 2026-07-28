import { useState, useRef } from 'react'
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

  // Crop / Zoom Modal State for uploaded screenshots
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState<number>(1.4)
  const [offsetX, setOffsetX] = useState<number>(0)
  const [offsetY, setOffsetY] = useState<number>(0)
  const [previewZoom, setPreviewZoom] = useState<number>(1)

  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Invalid file format. Please select a PNG, JPEG, or WEBP image.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Please select an image smaller than 10MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64Str = reader.result as string
      setRawImageSrc(base64Str)
      setZoomScale(1.4)
      setOffsetX(0)
      setOffsetY(0)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const generateCroppedBase64 = (): string | null => {
    if (!imgRef.current) return null
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    const size = 600
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const minDim = Math.min(img.naturalWidth, img.naturalHeight)
    const cropSize = minDim / zoomScale

    const centerX = img.naturalWidth / 2 + offsetX * (img.naturalWidth / 2)
    const centerY = img.naturalHeight / 2 + offsetY * (img.naturalHeight / 2)

    let srcX = centerX - cropSize / 2
    let srcY = centerY - cropSize / 2

    srcX = Math.max(0, Math.min(img.naturalWidth - cropSize, srcX))
    srcY = Math.max(0, Math.min(img.naturalHeight - cropSize, srcY))

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, srcX, srcY, cropSize, cropSize, 0, 0, size, size)

    return canvas.toDataURL('image/png')
  }

  const handleSaveCroppedQr = async () => {
    if (!rawImageSrc) return
    setIsUploading(true)

    try {
      const croppedBase64 = generateCroppedBase64() || rawImageSrc
      const updated = await businessProfileService.saveProfile({ paymentQrCode: croppedBase64 })
      if (onProfileUpdated) onProfileUpdated(updated)
      setRawImageSrc(null)
    } catch (err) {
      console.error('Failed to save QR code:', err)
      alert('Failed to save cropped QR code image.')
    } finally {
      setIsUploading(false)
    }
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

  // NO QR CODE CONFIGURED - Placeholder
  if (!businessProfile?.paymentQrCode && !rawImageSrc) {
    return (
      <div className="mt-2.5 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5 animate-fadeIn">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shadow-xs">
          📷
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-amber-900">No QR Code Added</h4>
          <p className="text-xs font-medium text-amber-700 mt-1 max-w-xs leading-snug">
            Upload your GPay / PhonePe / Paytm UPI QR Code. You can crop & zoom to isolate the QR pattern!
          </p>
        </div>

        <label className="cursor-pointer px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 mt-1">
          <span>{isUploading ? 'Processing...' : 'Upload QR Image'}</span>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>
    )
  }

  return (
    <div className={`mt-2.5 ${compact ? 'p-3' : 'p-4'} bg-emerald-50/90 border border-emerald-200 rounded-3xl flex flex-col items-center justify-center text-center gap-3 animate-fadeIn w-full`}>
      {showTitle && (
        <span className="text-sm font-extrabold text-emerald-900 tracking-tight">
          Online Payment QR Code
        </span>
      )}

      {/* Centered Scan Container */}
      {businessProfile?.paymentQrCode && (
        <div
          onClick={() => {
            setPreviewZoom(1)
            setShowPreviewModal(true)
          }}
          className="p-4 bg-white rounded-3xl border border-emerald-200 shadow-lg flex flex-col items-center cursor-pointer hover:shadow-xl transition-all active:scale-98 w-full max-w-sm"
        >
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-white p-2 flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner">
            <img
              src={businessProfile.paymentQrCode}
              alt="UPI Payment QR Code"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="mt-3 text-center w-full">
            <span className="text-sm font-black text-gray-900 uppercase tracking-wider block">
              Scan to Pay
            </span>
            {businessProfile.businessName && (
              <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                {businessProfile.businessName}
              </span>
            )}
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full inline-block mt-2">
              🔍 Tap QR Code for Giant Scanner View & Zoom
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all">
          <span>{businessProfile?.paymentQrCode ? 'Crop & Upload New' : 'Upload QR'}</span>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>

        {businessProfile?.paymentQrCode && (
          <>
            <button
              type="button"
              onClick={() => {
                setPreviewZoom(1)
                setShowPreviewModal(true)
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-all"
            >
              Giant View 🔍
            </button>

            <button
              type="button"
              onClick={handleRemoveQrCode}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 font-bold text-xs rounded-xl border border-red-200/60 transition-all"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {/* ── CROP & ZOOM ADJUSTMENT MODAL (For screenshot uploaded files) ── */}
      {rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full flex flex-col gap-4 shadow-2xl border border-emerald-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  Crop & Focus QR Code
                </h3>
                <p className="text-xs font-semibold text-emerald-700">
                  Zoom in to isolate the QR code pattern and remove phone screenshot borders
                </p>
              </div>
              <button
                onClick={() => setRawImageSrc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Interactive Crop Preview Box */}
            <div className="relative w-full h-72 sm:h-80 bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-emerald-500 shadow-inner">
              <img
                ref={imgRef}
                src={rawImageSrc}
                alt="Raw Uploaded QR"
                className="max-w-none transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoomScale}) translate(${offsetX * 30}%, ${offsetY * 30}%)`,
                }}
              />

              {/* Square Crop Target Frame */}
              <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400/80 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                </div>
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                </div>
              </div>
            </div>

            {/* Adjustment Controls */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col gap-3">
              {/* Zoom Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-extrabold text-gray-800">
                  <span>Zoom Level (Isolate QR Code)</span>
                  <span className="text-emerald-700 font-mono">{zoomScale.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.1"
                  value={zoomScale}
                  onChange={e => setZoomScale(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Position Sliders */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold text-gray-700">Move Left / Right</span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={offsetX}
                    onChange={e => setOffsetX(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold text-gray-700">Move Up / Down</span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={offsetY}
                    onChange={e => setOffsetY(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRawImageSrc(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedQr}
                disabled={isUploading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md"
              >
                {isUploading ? 'Saving...' : 'Crop & Save QR Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GIANT FULLSCREEN SCANNER MODAL ── */}
      {showPreviewModal && businessProfile?.paymentQrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full flex flex-col items-center gap-4 shadow-2xl border border-emerald-200 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between w-full border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  Customer Scanner Display
                </h3>
                <p className="text-xs font-bold text-emerald-700">
                  Giant high-contrast display for instant scanning
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-between w-full bg-slate-100 p-2.5 rounded-2xl text-xs font-extrabold text-gray-800">
              <span>Display Magnification:</span>
              <div className="flex items-center gap-1.5">
                {[1, 1.3, 1.6, 2].map(scale => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => setPreviewZoom(scale)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
                      previewZoom === scale
                        ? 'bg-emerald-600 text-white font-black shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
            </div>

            {/* Giant Fullscreen QR Display Container */}
            <div className="p-4 bg-white rounded-3xl border-2 border-emerald-400 shadow-2xl flex flex-col items-center justify-center w-full overflow-hidden">
              <div className="w-full h-80 sm:h-96 max-h-[60vh] flex items-center justify-center overflow-hidden bg-white rounded-2xl">
                <img
                  src={businessProfile.paymentQrCode}
                  alt="Full Preview Payment QR"
                  className="w-full h-full object-contain rounded-2xl bg-white transition-transform duration-200"
                  style={{ transform: `scale(${previewZoom})` }}
                />
              </div>

              <div className="mt-4 text-center">
                <span className="text-base font-black text-gray-900 uppercase tracking-widest block">
                  Scan to Pay
                </span>
                {businessProfile.businessName && (
                  <span className="text-sm font-extrabold text-emerald-700 block mt-0.5">
                    {businessProfile.businessName}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl transition-all"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

