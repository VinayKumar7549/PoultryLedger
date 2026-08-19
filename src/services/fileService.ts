import { Capacitor, registerPlugin } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import jsPDF from 'jspdf'

interface NativeFileOpenerPlugin {
  openFile(options: { filePath: string; mimeType?: string }): Promise<{ success?: boolean; noAppFound?: boolean }>
}

const NativeFileOpener = registerPlugin<NativeFileOpenerPlugin>('NativeFileOpener')

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
   * Explicitly verifies and creates the master root directory 'PoultryLedger' under Documents
   */
  async ensureRootDirectoryExists(): Promise<void> {
    if (!this.isAndroid()) return
    await this.ensureStoragePermissions()

    try {
      await Filesystem.mkdir({
        path: 'PoultryLedger',
        directory: Directory.Documents,
        recursive: true,
      })
    } catch {
      // Directory exists
    }
  }

  /**
   * Automatically creates the required application directory tree inside Documents/PoultryLedger/:
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

    // 1. First ensure root PoultryLedger directory exists
    await this.ensureRootDirectoryExists()

    // 2. Ensure subdirectories strictly under Documents/PoultryLedger/
    const directories = [
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
      } catch {
        // Folder exists or creation handled
      }
    }

    // 3. Migration / Cleanup: Move any files from legacy root category folders to Reports/<Category>/
    const categories: ReportCategory[] = [
      'Customer Statements',
      'Daily Sales',
      'Credit Reports',
      'Inventory',
      'Expenses',
    ]

    for (const category of categories) {
      const legacyPath = `PoultryLedger/${category}`
      const newPathDir = `PoultryLedger/Reports/${category}`
      try {
        const res = await Filesystem.readdir({
          path: legacyPath,
          directory: Directory.Documents,
        })
        if (res && res.files) {
          for (const f of res.files) {
            const fname = typeof f === 'string' ? f : f.name
            if (fname) {
              try {
                await Filesystem.rename({
                  from: `${legacyPath}/${fname}`,
                  directory: Directory.Documents,
                  to: `${newPathDir}/${fname}`,
                  toDirectory: Directory.Documents,
                })
              } catch {
                // Ignore rename errors if target already moved
              }
            }
          }
        }
        await Filesystem.rmdir({
          path: legacyPath,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch {
        // Legacy dir does not exist or already clean
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
   * Generate & Save PDF file directly to Internal Storage inside Documents/PoultryLedger/Reports/<Category>/
   * 
   * Strict 6-Step Execution Flow:
   * 1. Verify 'Documents/' and 'PoultryLedger' root directory exists (if not, create it)
   * 2. Verify required subfolder 'PoultryLedger/Reports/<Category>' exists (if not, create it)
   * 3. Extract base64 and write file to Documents/PoultryLedger/Reports/<Category>/<filename>
   * 4. Verify file exists on disk using Filesystem.stat
   * 5. Verify file size > 0
   * 6. Return verified success result with real verified path
   */
  async savePdf(
    pdfDoc: jsPDF,
    filename: string,
    _title: string = 'PoultryLedger Report',
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
          folderLocation: `Downloads / PoultryLedger / Reports / ${category}`,
          creationTime: nowStr,
          message: `PDF exported successfully: ${filename}`,
        }
      }

      // STEP 1 & 2: VERIFY & CREATE ROOT 'PoultryLedger' AND 'Reports/<Category>' SUBFOLDER
      await this.ensureDirectoryStructure()

      const targetDir = `PoultryLedger/Reports/${category}`

      try {
        await Filesystem.mkdir({
          path: targetDir,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch {
        // Directory exists
      }

      // Extract base64 representation of PDF
      const dataUri = pdfDoc.output('datauristring')
      const base64Data = dataUri.split(',')[1]

      const relativePath = `${targetDir}/${filename}`

      // STEP 3: WRITE FILE TO DISK
      const saveRes = await Filesystem.writeFile({
        path: relativePath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      })

      // STEP 4 & 5: DISK VERIFICATION - Check presence & file size > 0
      const statRes = await Filesystem.stat({
        path: relativePath,
        directory: Directory.Documents,
      })

      if (!statRes || !statRes.size || statRes.size <= 0) {
        throw new Error(`Disk verification failed: File was not created or is 0 bytes at ${relativePath}`)
      }

      const folderLocationDisplay = `Documents/PoultryLedger/Reports/${category}/`

      // STEP 6: RETURN VERIFIED SUCCESS RESULT
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
   * 
   * Strict 6-Step Execution Flow:
   * 1. Verify 'Documents/' and 'PoultryLedger' root directory exists (if not, create it)
   * 2. Verify 'Backups' subfolder inside 'PoultryLedger' exists (if not, create it)
   * 3. Write backup JSON to Documents/PoultryLedger/Backups/<filename>
   * 4. Verify file exists on disk using Filesystem.stat
   * 5. Verify file size > 0
   * 6. Return verified success result with real verified path
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
          folderLocation: 'Downloads / PoultryLedger / Backups',
          fileSize: blob.size,
          creationTime: nowStr,
          message: `Backup JSON downloaded successfully: ${filename}`,
        }
      }

      // STEP 1 & 2: VERIFY & CREATE ROOT 'PoultryLedger' AND 'Backups' SUBFOLDER
      await this.ensureDirectoryStructure()

      const backupDir = 'PoultryLedger/Backups'
      try {
        await Filesystem.mkdir({
          path: backupDir,
          directory: Directory.Documents,
          recursive: true,
        })
      } catch {
        // Directory exists
      }

      const relativePath = `${backupDir}/${filename}`

      // STEP 3: WRITE BACKUP FILE TO DISK
      const saveRes = await Filesystem.writeFile({
        path: relativePath,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      })


      // STEP 4 & 5: DISK VERIFICATION - Check presence & file size > 0
      const statRes = await Filesystem.stat({
        path: relativePath,
        directory: Directory.Documents,
      })

      if (!statRes || !statRes.size || statRes.size <= 0) {
        throw new Error('Verification failed: Database backup file was not created on disk or is 0 bytes.')
      }

      const folderLocationDisplay = 'Documents/PoultryLedger/Backups/'
      

      // STEP 6: RETURN VERIFIED SUCCESS RESULT
      return {
        success: true,
        filename,
        folderLocation: folderLocationDisplay,
        fullPath: statRes.uri || saveRes.uri,
        uri: saveRes.uri,
        fileSize: statRes.size,
        creationTime: nowStr,
        message: `Backup completed successfully: ${folderLocationDisplay}${filename}`,
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
   * Directly opens exported PDF / JSON file using native Android ACTION_VIEW intent (FileProvider)
   * Launches Android's native OS chooser (Adobe Acrobat, Google Drive PDF Viewer, WPS Office, etc.) with Just Once / Always options.
   */
  async openFile(
    fileUri: string,
    mimeType: string = 'application/pdf'
  ): Promise<{ success: boolean; noAppFound?: boolean }> {
    try {
      if (this.isAndroid()) {
        const res = await NativeFileOpener.openFile({
          filePath: fileUri,
          mimeType,
        })
        if (res && res.noAppFound) {
          return { success: false, noAppFound: true }
        }
        return { success: true }
      } else {
        window.open(fileUri, '_blank')
        return { success: true }
      }
    } catch (err: any) {
      console.error('[FileService] Open file action exception:', err)
      return { success: false }
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
