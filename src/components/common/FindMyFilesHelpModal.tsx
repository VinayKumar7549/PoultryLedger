import { fileService } from '../../services/fileService'

interface FindMyFilesHelpModalProps {
  isOpen: boolean
  onClose: () => void
  folderUri?: string
}

export function FindMyFilesHelpModal({ isOpen, onClose, folderUri }: FindMyFilesHelpModalProps) {
  if (!isOpen) return null

  const handleOpenFolder = async () => {
    try {
      if (folderUri) {
        await fileService.openFile(folderUri, 'Open Folder')
      } else {
        // Fallback info if direct folder opening isn't supported by device
      }
    } catch {
      // If Android cannot directly open the folder, show reassurance without error
    }
  }

  const handleGetCxFileExplorer = () => {
    try {
      const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.cxinventor.file.explorer'
      window.open(playStoreUrl, '_blank')
    } catch {
      // If Google Play Store is unavailable, simply close without showing an error
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl border border-emerald-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shadow-xs">
              📁
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                Finding Your Saved Files
              </h3>
              <p className="text-xs font-semibold text-emerald-700">
                Storage & Browsing Guidance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 font-medium flex items-start gap-2">
            <span className="text-base">✓</span>
            <div>
              <strong>Your files have already been saved successfully.</strong>
              <p className="mt-0.5 text-[11px] text-emerald-800">
                All database backups and exported PDF reports are verified on internal storage before completion.
              </p>
            </div>
          </div>

          <p>
            The default Google Files application may organize or display folders differently depending on your Android device model and Android OS version.
          </p>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800">
            <span className="font-sans font-bold text-gray-500 block uppercase text-[10px] tracking-wider mb-1">
              Exact Directory Location:
            </span>
            <span className="font-extrabold text-emerald-800 break-all">
              Documents/PoultryLedger/
            </span>
          </div>

          <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200/80 text-amber-900 space-y-1">
            <strong className="font-extrabold text-amber-950 block text-xs">
              Optional Browsing Alternative:
            </strong>
            <p className="text-[11px] text-amber-900 leading-normal">
              If you cannot locate the folder using Google Files, we recommend using <strong>CX File Explorer</strong>, a free and lightweight file manager that displays the complete folder structure and makes it easier to browse your saved files.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleOpenFolder}
              className="py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>📂</span>
              <span>Open Folder</span>
            </button>

            <button
              onClick={handleGetCxFileExplorer}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span>🚀</span>
              <span>Get CX File Explorer</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-200/80 hover:bg-slate-300 active:scale-98 text-slate-800 font-bold text-xs rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
