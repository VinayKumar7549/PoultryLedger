import { useState, useEffect } from 'react'
import {
  backupService,
  PoultryLedgerBackup,
  BackupMetadata,
  BackupHealth,
} from '../services/backupService'
import { fileService, FileActionResult } from '../services/fileService'
import { fmtDate } from '../utils/date'
import { IconMenu } from '../components/common/Icons'
import { ExportSuccessModal } from '../components/common/ExportSuccessModal'

export function BackupRestoreScreen({ onMenuOpen }: { onMenuOpen: () => void }) {
  const [currentBackup, setCurrentBackup] = useState<PoultryLedgerBackup | null>(null)
  const [health, setHealth] = useState<BackupHealth | null>(null)
  const [selectedFileBackup, setSelectedFileBackup] = useState<PoultryLedgerBackup | null>(null)
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<BackupMetadata | null>(null)
  const [exportSuccessDetails, setExportSuccessDetails] = useState<FileActionResult | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    title?: string
    text: string
    details?: string[]
  } | null>(null)

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false)

  const isAndroid = fileService.isAndroid()

  // Load current database stats and backup health on mount
  const refreshStats = async () => {
    try {
      const backup = await backupService.createBackup()
      setCurrentBackup(backup)
      const h = await backupService.getBackupHealth()
      setHealth(h)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    refreshStats()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true)
      setStatusMessage(null)
      const backup = await backupService.createBackup()
      setCurrentBackup(backup)
      const result = await backupService.downloadBackupFile(backup)
      await refreshStats()

      if (result.success) {
        setExportSuccessDetails(result)
      } else {
        setStatusMessage({
          type: 'error',
          title: 'Backup Failed',
          text: result.message,
        })
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        title: 'Backup Failed',
        text: err?.message || 'Failed to generate backup.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateAndSelectBackup = (jsonContent: any) => {
    const validation = backupService.validateBackup(jsonContent)

    if (!validation.valid) {
      setStatusMessage({
        type: 'error',
        title: 'Backup Validation Failed',
        text: validation.error || 'Invalid backup file structure.',
        details: validation.details,
      })
      setSelectedFileBackup(null)
      setSelectedFileMetadata(null)
    } else {
      setSelectedFileBackup(jsonContent as PoultryLedgerBackup)
      setSelectedFileMetadata(validation.metadata || null)
      setShowConfirmModal(true)
    }
  }

  const handleAndroidFilePick = async () => {
    setStatusMessage(null)
    try {
      setIsLoading(true)
      const res = await fileService.pickBackupJsonFile()
      if (res.cancelled) {
        return
      }
      if (!res.success || !res.data) {
        setStatusMessage({
          type: 'error',
          title: 'Backup Selection Failed',
          text: res.message || 'Unable to read the selected file.',
        })
        return
      }
      validateAndSelectBackup(res.data)
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        title: 'File Selection Error',
        text: err?.message || 'An unexpected error occurred while opening file picker.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string)
        validateAndSelectBackup(jsonContent)
      } catch (err) {
        setStatusMessage({
          type: 'error',
          title: 'Invalid File Format',
          text: 'Failed to parse file. Please upload a valid JSON backup file.',
        })
        setSelectedFileBackup(null)
        setSelectedFileMetadata(null)
      }
    }
    reader.readAsText(file)
    // reset input value so re-selecting same file triggers onChange
    e.target.value = ''
  }

  const handleConfirmRestore = async () => {
    if (!selectedFileBackup) return

    try {
      setIsLoading(true)
      setShowConfirmModal(false)
      const res = await backupService.restoreBackup(selectedFileBackup)

      if (res.success) {
        setStatusMessage({
          type: 'success',
          title: 'Restore Successful',
          text: 'Database verification passed 100%. Reloading application...',
        })
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setStatusMessage({
          type: 'error',
          title: 'Restore Failed',
          text: res.message,
        })
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        title: 'Restore Error',
        text: err?.message || 'Failed to restore database.',
      })
    } finally {
      setIsLoading(false)
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
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Backup & Restore System</h1>
            <p className="text-xs text-gray-500 font-medium">100% Offline SQLite Data Safety</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Notification Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex flex-col gap-1 shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <strong className="font-extrabold text-sm">
                {statusMessage.type === 'success' ? '✓ ' : '✕ '}
                {statusMessage.title || (statusMessage.type === 'success' ? 'Success' : 'Error')}
              </strong>
              <button onClick={() => setStatusMessage(null)} className="text-gray-500 font-bold hover:text-gray-800">
                ✕
              </button>
            </div>
            <p className="text-xs">{statusMessage.text}</p>
            {statusMessage.details && statusMessage.details.length > 0 && (
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] opacity-90">
                {statusMessage.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── BACKUP HEALTH MONITOR ── */}
        {health && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>🛡 Backup Health Monitor</span>
              </h2>
              <span
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                  health.needsReminder
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {health.needsReminder ? 'Backup Recommended' : 'Healthy'}
              </span>
            </div>

            {health.needsReminder && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-medium">
                ⚠ <strong>Warning:</strong> It has been <strong>{health.daysSinceLastBackup} days</strong> since your last backup. Please create a backup to prevent data loss.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 text-[10px] block font-semibold">Last Backup Time</span>
                <span className="font-extrabold text-gray-900">
                  {health.lastBackupTime ? fmtDate(health.lastBackupTime.split('T')[0]) : 'Never'}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 text-[10px] block font-semibold">Days Since Backup</span>
                <span className="font-extrabold text-gray-900">{health.daysSinceLastBackup} Days</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 text-[10px] block font-semibold">Backup Size</span>
                <span className="font-extrabold text-gray-900">
                  {health.backupSize ? `${(health.backupSize / 1024).toFixed(1)} KB` : 'N/A'}
                </span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 text-[10px] block font-semibold">Last Restore Time</span>
                <span className="font-extrabold text-gray-900">
                  {health.lastRestoreTime ? fmtDate(health.lastRestoreTime.split('T')[0]) : 'Never'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE BACKUP CARD ── */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Create Complete JSON Backup</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Export all SQLite tables into an offline JSON backup file.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
              Offline Ready
            </span>
          </div>

          {/* Current SQLite Database Record Breakdown */}
          {currentBackup?.metadata && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col gap-2 my-1">
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700">Business: {currentBackup.metadata.businessName}</span>
                <span className="text-slate-500 text-[11px]">
                  Schema v{currentBackup.metadata.databaseSchemaVersion}
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Customers</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.customers}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Routes</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.routes}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Transactions</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.transactions}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Purchases</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.purchases}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Expenses</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.expenses}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                  <span className="text-gray-400 text-[10px] block">Settings</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {currentBackup.metadata.recordCounts.settings}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateBackup}
            disabled={isLoading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Export & Download Backup JSON</span>
          </button>
        </div>

        {/* ── RESTORE DATABASE CARD ── */}
        <div className="bg-amber-50/60 rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-amber-900">Restore Database from File</h2>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Upload a JSON backup file to validate, preview, and restore database records.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-200 text-amber-900 text-[11px] font-bold rounded-full">
              Safe Rollback
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold">Restoration Safeguards:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
              <li>5-step structure, schema version, and data type validation.</li>
              <li>Automatic pre-restore snapshot & automatic rollback on error.</li>
              <li>Post-restore SQLite table record count verification.</li>
            </ul>
          </div>

          {isAndroid ? (
            <button
              onClick={handleAndroidFilePick}
              disabled={isLoading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>Choose Backup File to Restore</span>
            </button>
          ) : (
            <label className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span>Choose Backup File to Restore</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* ── PREVIEW & CONFIRMATION MODAL ── */}
      {showConfirmModal && selectedFileMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Confirm Database Restoration</h3>
                <p className="text-xs text-gray-500 font-medium">Verify backup content before applying</p>
              </div>
            </div>

            <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-800">
              <span className="font-bold block">Caution:</span>
              Restoring will replace your current SQLite database with the contents of this backup file. An automatic backup snapshot will be taken prior to restore for instant rollback if any error occurs.
            </div>

            {/* Comprehensive Metadata & Record Counts Preview */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col gap-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5 font-semibold text-slate-800">
                <span>Business Name:</span>
                <span className="font-bold text-gray-900">{selectedFileMetadata.businessName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5 text-slate-600">
                <span>Backup Date & Time:</span>
                <span className="font-semibold text-gray-800">
                  {fmtDate(selectedFileMetadata.backupTimestamp.slice(0, 10))}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5 text-slate-600">
                <span>App Version / Schema:</span>
                <span className="font-semibold text-gray-800">
                  v{selectedFileMetadata.applicationVersion} (Schema v{selectedFileMetadata.databaseSchemaVersion})
                </span>
              </div>

              <span className="font-bold text-gray-800 mt-1">Backup Contents Preview:</span>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Customers</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.customers}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Transactions</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.transactions}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Expenses</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.expenses}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Purchases</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.purchases}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Routes</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.routes}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200">
                  <span className="text-gray-400 block">Settings</span>
                  <span className="font-bold text-gray-900">{selectedFileMetadata.recordCounts.settings}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-sm"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING OVERLAY ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-xs">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-800">Processing database backup/restore...</p>
        </div>
      )}

      {/* ── EXPORT SUCCESS MODAL ── */}
      <ExportSuccessModal details={exportSuccessDetails} onClose={() => setExportSuccessDetails(null)} />
    </div>
  )
}
