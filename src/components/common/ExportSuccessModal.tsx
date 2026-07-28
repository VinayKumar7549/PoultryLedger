import { useState } from 'react'
import { fileService, FileActionResult } from '../../services/fileService'
import { FindMyFilesHelpModal } from './FindMyFilesHelpModal'

export interface ExportSuccessModalProps {
  details: FileActionResult | null
  onClose: () => void
}

export function ExportSuccessModal({ details, onClose }: ExportSuccessModalProps) {
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showNoPdfViewerModal, setShowNoPdfViewerModal] = useState(false)

  if (!details || !details.success) return null

  const formattedSize = details.fileSize
    ? details.fileSize > 1024 * 1024
      ? `${(details.fileSize / (1024 * 1024)).toFixed(2)} MB`
      : `${(details.fileSize / 1024).toFixed(1)} KB`
    : null

  const handleShare = () => {
    if (details.uri || details.fullPath) {
      const targetUri = details.fullPath || details.uri || ''
      fileService.shareFile(targetUri, details.filename || 'PoultryLedger File', details.message)
    }
  }

  const handleOpenFile = async () => {
    if (details.fullPath || details.uri) {
      const targetUri = details.fullPath || details.uri || ''
      const mimeType = details.filename?.toLowerCase().endsWith('.json')
        ? 'application/json'
        : 'application/pdf'

      const res = await fileService.openFile(targetUri, mimeType)
      if (res && res.noAppFound) {
        setShowNoPdfViewerModal(true)
      }
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-emerald-100 max-h-[92vh] overflow-y-auto">
          {/* Header Icon */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-sm">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-gray-900 leading-tight">
                Saved Successfully
              </h3>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                File written & verified on Internal Storage
              </p>
            </div>
          </div>

          {/* Main Info Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Name</span>
              <span className="font-extrabold text-gray-900 break-all">{details.filename || 'File'}</span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</span>
              <span className="font-bold text-emerald-800 break-all bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-mono text-[11px]">
                📁 {details.folderLocation || 'Documents/PoultryLedger/'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Creation Time</span>
                <span className="font-bold text-gray-800">{details.creationTime || 'Just now'}</span>
              </div>
              {formattedSize && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">File Size</span>
                  <span className="font-bold text-gray-800">{formattedSize}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions: Open File, Share, Done */}
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenFile}
                className="py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>👁</span>
                <span>Open File</span>
              </button>

              <button
                onClick={handleShare}
                className="py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 text-emerald-800 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <span>📤</span>
                <span>Share</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>✅</span>
              <span>Done</span>
            </button>
          </div>

          {/* Reassuring Guidance Card: Where are my files? */}
          <div className="bg-emerald-50/90 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-900">
                <span>📁</span>
                <span>Where are my files?</span>
              </div>
              <button
                onClick={() => setShowHelpModal(true)}
                className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Can't Find My Files?
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-900">
              Your file has been successfully saved to <strong>{details.folderLocation || 'Documents/PoultryLedger/'}</strong>.
            </p>
            <p className="text-[10px] leading-normal text-emerald-800/90 border-t border-emerald-200/80 pt-1.5 mt-0.5">
              Some Android file manager apps (such as Google Files on certain Android versions) may display folders differently.
            </p>
            <p className="text-[10px] leading-normal text-emerald-900 font-medium">
              If you cannot locate the folder, we recommend using <strong>CX File Explorer</strong>, which displays the complete folder structure and makes it easier to browse your backups and reports.
            </p>
          </div>
        </div>
      </div>

      {/* ── NO PDF VIEWER FOUND MODAL ── */}
      {showNoPdfViewerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-amber-200">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl font-bold shadow-sm">
                📄
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  No PDF Viewer Found
                </h3>
                <p className="text-xs font-medium text-gray-600 mt-1 leading-snug">
                  No application capable of opening PDF files is installed on this device.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowNoPdfViewerModal(false)
                  handleShare()
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>📤</span>
                <span>Share PDF</span>
              </button>

              <button
                onClick={() => {
                  try {
                    window.open('https://play.google.com/store/search?q=pdf+viewer&c=apps', '_blank')
                  } catch {}
                  setShowNoPdfViewerModal(false)
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <span>🚀</span>
                <span>Get PDF Viewer</span>
              </button>

              <button
                onClick={() => setShowNoPdfViewerModal(false)}
                className="w-full py-2.5 bg-slate-200/80 hover:bg-slate-300 active:scale-98 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FIND MY FILES HELP MODAL ── */}
      <FindMyFilesHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        folderUri={details.uri}
      />
    </>
  )
}

