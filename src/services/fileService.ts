import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import jsPDF from 'jspdf'

export interface FileActionResult {
  success: boolean
  filename?: string
  folderLocation?: string
  fullPath?: string
  uri?: string
  fileSize?: number
  creationTime?: string
  message: string
  cancelled?: boolean
}

export interface PickFileResult<T = any> {
  success: boolean
  data?: T
  cancelled?: boolean
  message?: string
}

export type ReportCategory =
  | 'Customer Statements'
  | 'Daily Sales'
  | 'Credit Reports'
  | 'Inventory'
  | 'Expenses'

class FileService {
  /**
   * Check if current environment is native Android
   */
  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android'
  }

  /**
   * Helper to ensure storage permissions are requested on Android if needed
   */
  private async ensureStoragePermissions(): Promise<void> {
    if (!this.isAndroid()) return
    try {
      const status = await Filesystem.checkPermissions()
      if (status.publicStorage !== 'granted') {
        const req = await Filesystem.requestPermissions()
        if (req.publicStorage !== 'granted') {
          throw new Error('Permission denied: Storage access was denied by OS.')
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('denied')) {
        throw new Error('Permission denied: Storage access is required to save files on your device.')
      }
    }
  }

  /**
   * Automatically creates the required application directory tree:
   * Documents/
   * └── PoultryLedger/
   *     ├── Backups/
   *     └── Reports/
   *         ├── Customer Statements/
   *         ├── Daily Sales/
   *         ├── Credit Reports/
   *         ├── Inventory/
   *         └── Expenses/
   */
  async ensureDirectoryStructure(): Promise<void> {
    if (!this.isAndroid()) return
    await this.ensureStoragePermissions()

    const directories = [
      'PoultryLedger',
      'PoultryLedger/Backups',
      'PoultryLedger/Reports',
      'PoultryLedger/Reports/Customer Statements',
      'PoultryLedger/Reports/Daily Sales',
      'PoultryLedger/Reports/Credit Reports',
      'PoultryLedger/Reports/Inventory',
      'PoultryLedger/Reports/Expenses',
    ]

    for (const dirPath of directories) {
      try {
        await Filesystem.mkdir({
          path: dirPath,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch (err: any) {
        // Folder exists or creation handled
      }
    }
  }

  /**
   * Safe helper to format date as YYYY-MM-DD_HH-mm
   */
  getFormattedTimestamp(date: Date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d}_${hh}-${mm}`
  }

  /**
   * Formats PDF filename as BusinessName_ReportType_YYYY-MM-DD_HH-mm.pdf
   */
  formatPdfFilename(businessName: string, reportType: string, date: Date = new Date()): string {
    const cleanBName = (businessName || 'PoultryLedger').trim().replace(/[^a-zA-Z0-9]/g, '_')
    const cleanType = reportType.trim().replace(/[^a-zA-Z0-9]/g, '_')
    const ts = this.getFormattedTimestamp(date)
    return `${cleanBName}_${cleanType}_${ts}.pdf`
  }

  /**
   * Formats Backup filename as Backup_YYYY-MM-DD_HH-mm.json
   */
  formatBackupFilename(date: Date = new Date()): string {
    const ts = this.getFormattedTimestamp(date)
    return `Backup_${ts}.json`
  }

  /**
   * Generate & Save PDF file directly to Internal Storage in specific Category Subfolder
   * Documents/PoultryLedger/Reports/<Category>/<filename>
   */
  async savePdf(
    pdfDoc: jsPDF,
    filename: string,
    title: string = 'PoultryLedger Report',
    category: ReportCategory = 'Daily Sales'
  ): Promise<FileActionResult> {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (!this.isAndroid()) {
        // WEB BEHAVIOR
        pdfDoc.save(filename)
        return {
          success: true,
          filename,
          folderLocation: `Downloads / Reports / ${category}`,
          creationTime: nowStr,
          message: `PDF exported successfully: ${filename}`,
        }
      }

      // ANDROID BEHAVIOR: Ensure Directory Structure
      await this.ensureDirectoryStructure()

      const categoryDir = `PoultryLedger/Reports/${category}`
      const relativePath = `${categoryDir}/${filename}`

      // Pre-write folder verification / creation
      try {
        await Filesystem.mkdir({
          path: categoryDir,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch {
        // Folder exists
      }

      // Extract base64 representation of PDF
      const dataUri = pdfDoc.output('datauristring')
      const base64Data = dataUri.split(',')[1]

      const saveRes = await Filesystem.writeFile({
        path: relativePath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      })

      // POST-WRITE DISK VERIFICATION: Check presence & file size > 0
      const statRes = await Filesystem.stat({
        path: relativePath,
        directory: Directory.Documents,
      })

      if (!statRes || !statRes.size || statRes.size <= 0) {
        throw new Error(`Disk verification failed: File was not created or is 0 bytes at ${relativePath}`)
      }

      const folderLocationDisplay = `Documents/PoultryLedger/Reports/${category}/`

      return {
        success: true,
        filename,
        folderLocation: folderLocationDisplay,
        fullPath: statRes.uri || saveRes.uri,
        uri: saveRes.uri,
        fileSize: statRes.size,
        creationTime: nowStr,
        message: `PDF saved and verified: ${folderLocationDisplay}${filename}`,
      }
    } catch (err: any) {
      console.error('[FileService] Error saving PDF:', err)
      return {
        success: false,
        message: this.parseError(err, 'Failed to save PDF file.'),
      }
    }
  }

  /**
   * Save Database Backup JSON file directly to Internal Storage (Documents/PoultryLedger/Backups/)
   * Web: Triggers browser JSON file download
   * Android: Creates directories, writes file silently, and verifies disk presence & size > 0
   */
  async saveBackupJson(backupData: any, filename: string): Promise<FileActionResult> {
    try {
      const jsonStr = JSON.stringify(backupData, null, 2)
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (!this.isAndroid()) {
        // WEB BEHAVIOR
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        return {
          success: true,
          filename,
          folderLocation: 'Downloads (Browser)',
          fileSize: blob.size,
          creationTime: nowStr,
          message: `Backup JSON downloaded successfully: ${filename}`,
        }
      }

      // ANDROID BEHAVIOR: Ensure Directory Structure
      await this.ensureDirectoryStructure()

      const relativePath = `PoultryLedger/Backups/${filename}`

      const saveRes = await Filesystem.writeFile({
        path: relativePath,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })

      // POST-WRITE DISK VERIFICATION
      const statRes = await Filesystem.stat({
        path: relativePath,
        directory: Directory.Documents,
      })

      if (!statRes || statRes.size <= 0) {
        throw new Error('Verification failed: Database backup file was not created on disk or is 0 bytes.')
      }

      return {
        success: true,
        filename,
        folderLocation: 'Documents/PoultryLedger/Backups/',
        fullPath: statRes.uri || saveRes.uri,
        uri: saveRes.uri,
        fileSize: statRes.size,
        creationTime: nowStr,
        message: `Backup completed successfully: Documents/PoultryLedger/Backups/${filename}`,
      }
    } catch (err: any) {
      console.error('[FileService] Error saving Backup JSON:', err)
      return {
        success: false,
        message: this.parseError(err, 'Failed to save database backup.'),
      }
    }
  }

  /**
   * Optionally Share a file using native Capacitor Share Sheet
   */
  async shareFile(fileUri: string, title: string = 'Share File', text: string = ''): Promise<void> {
    try {
      await Share.share({
        title,
        text,
        url: fileUri,
        dialogTitle: 'Share File',
      })
    } catch (err: any) {
      console.log('[FileService] Share action dismissed or unhandled:', err)
    }
  }

  /**
   * Optionally Open a file using system viewer
   */
  async openFile(fileUri: string, title: string = 'Open File'): Promise<void> {
    try {
      if (this.isAndroid()) {
        await Share.share({
          title,
          url: fileUri,
          dialogTitle: 'View File',
        })
      } else {
        window.open(fileUri, '_blank')
      }
    } catch (err: any) {
      console.log('[FileService] Open file action dismissed:', err)
    }
  }

  /**
   * Pick and Read JSON Backup File
   * Used on Android via @capawesome/capacitor-file-picker
   */
  async pickBackupJsonFile(): Promise<PickFileResult> {
    try {
      if (!this.isAndroid()) {
        return {
          success: false,
          message: 'Native file picker is only available on Android. Use standard file input on Web.',
        }
      }

      const res = await FilePicker.pickFiles({
        types: ['application/json', 'text/plain'],
        readData: true,
        limit: 1,
      })

      if (!res.files || res.files.length === 0) {
        return {
          success: false,
          cancelled: true,
          message: 'Cancelled by user.',
        }
      }

      const file = res.files[0]
      let jsonContentStr = ''

      if (file.data) {
        // Decode base64 if returned by readData
        jsonContentStr = this.decodeBase64OrRaw(file.data)
      } else if (file.path) {
        // Read directly from filesystem path if data was omitted
        const readRes = await Filesystem.readFile({
          path: file.path,
          encoding: Encoding.UTF8,
        })
        jsonContentStr = typeof readRes.data === 'string' ? readRes.data : ''
      }

      if (!jsonContentStr) {
        return {
          success: false,
          message: 'Corrupt backup: File is empty or could not be read.',
        }
      }

      const parsedData = JSON.parse(jsonContentStr)
      return {
        success: true,
        data: parsedData,
      }
    } catch (err: any) {
      console.error('[FileService] Error picking/reading backup file:', err)

      if (
        err?.message?.toLowerCase().includes('cancel') ||
        err?.message?.toLowerCase().includes('user canceled') ||
        err?.code === 'PICK_FILES_CANCELLED'
      ) {
        return {
          success: false,
          cancelled: true,
          message: 'Cancelled by user.',
        }
      }

      return {
        success: false,
        message: this.parseError(err, 'Failed to read selected backup file.'),
      }
    }
  }

  /**
   * Utility to convert base64 or raw string to decoded string safely
   */
  private decodeBase64OrRaw(dataStr: string): string {
    const trimmed = dataStr.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed
    }
    try {
      const binaryString = atob(dataStr)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return new TextDecoder().decode(bytes)
    } catch {
      return dataStr
    }
  }

  /**
   * Utility to map raw exceptions to human-readable error messages
   */
  private parseError(err: any, fallback: string): string {
    const rawMsg = err?.message || String(err || '')
    const lower = rawMsg.toLowerCase()

    if (lower.includes('permission') || lower.includes('denied')) {
      return 'Permission denied: Storage access was denied by OS.'
    }
    if (lower.includes('enospc') || lower.includes('storage full') || lower.includes('space')) {
      return 'Storage full: Insufficient disk space on device.'
    }
    if (lower.includes('filesystem') || lower.includes('directory') || lower.includes('path')) {
      return 'Filesystem unavailable: Could not access internal storage folder.'
    }
    if (lower.includes('json') || lower.includes('syntaxerror') || lower.includes('parse')) {
      return 'Invalid backup: Selected file is not a valid JSON structure.'
    }
    if (lower.includes('cancel')) {
      return 'Cancelled by user.'
    }

    return rawMsg ? `${fallback} (${rawMsg})` : fallback
  }
}

export const fileService = new FileService()
