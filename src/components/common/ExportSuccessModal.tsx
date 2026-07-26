import { fileService, FileActionResult } from '../../services/fileService'

export interface ExportSuccessModalProps {
  details: FileActionResult | null
  onClose: () => void
}

export function ExportSuccessModal({ details, onClose }: ExportSuccessModalProps) {
  if (!details || !details.success) return null

  const formattedSize = details.fileSize
    ? details.fileSize > 1024 * 1024
      ? `${(details.fileSize / (1024 * 1024)).toFixed(2)} MB`
      : `${(details.fileSize / 1024).toFixed(1)} KB`
    : null

  const handleShare = () => {
    if (details.uri) {
      fileService.shareFile(details.uri, details.filename || 'PoultryLedger File', details.message)
    }
  }

  const handleOpenFile = () => {
    if (details.uri) {
      fileService.openFile(details.uri, details.filename || 'Open File')
    }
  }

  const handleOpenFolder = () => {
    if (details.uri) {
      // Opening directory uri via Share dialog or system intent
      fileService.openFile(details.uri, 'Open Folder')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-emerald-100">
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

        {/* Info Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Name</span>
            <span className="font-extrabold text-gray-900 break-all">{details.filename || 'File'}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Folder Location</span>
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

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          {details.uri && (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <button
                onClick={handleOpenFile}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-[11px] rounded-xl transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>👁</span>
                <span>Open File</span>
              </button>

              <button
                onClick={handleOpenFolder}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-[11px] rounded-xl transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>📂</span>
                <span>Open Folder</span>
              </button>

              <button
                onClick={handleShare}
                className="py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 text-emerald-800 font-bold text-[11px] rounded-xl transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <span>↗</span>
                <span>Share</span>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
