import { dbInstance } from '../database/database'
import { settingsRepository } from '../database/repositories/SettingsRepository'
import { fileService, FileActionResult } from './fileService'

export interface RecordCounts {
  customers: number
  routes: number
  transactions: number
  expenses: number
  purchases: number
  settings: number
}

export interface BackupMetadata {
  applicationName?: string
  applicationVersion: string
  databaseSchemaVersion: number
  backupTimestamp: string
  businessName: string
  generatedBy?: string
  recordCounts: RecordCounts
}

export interface PoultryLedgerBackup {
  metadata: BackupMetadata
  data: {
    customers: any[]
    routes: any[]
    transactions: any[]
    expenses: any[]
    purchases: any[]
    settings: any[]
  }
}

export interface BackupHealth {
  lastBackupTime: string | null
  lastRestoreTime: string | null
  backupSize: number | null
  daysSinceLastBackup: number
  needsReminder: boolean
}

export interface ValidationResult {
  valid: boolean
  error?: string
  details?: string[]
  metadata?: BackupMetadata
}

export interface VerificationResult {
  verified: boolean
  error?: string
  actualCounts?: RecordCounts
  expectedCounts?: RecordCounts
}

class BackupService {
  readonly CURRENT_APP_VERSION = '1.0.0'
  readonly CURRENT_SCHEMA_VERSION = 1

  /**
   * Helper to format filename as BusinessName_Backup_YYYY-MM-DD_HH-MM.json
   */
  getBackupFilename(businessName: string, date: Date = new Date()): string {
    const cleanName = businessName.trim().replace(/[^a-zA-Z0-9]/g, '') || 'PoultryLedger'

    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')

    return `${cleanName}_Backup_${y}-${m}-${d}_${hh}-${mm}.json`
  }

  /**
   * 1. CREATE BACKUP
   * Queries SQLite database for all 6 tables and builds complete JSON backup object
   */
  async createBackup(): Promise<PoultryLedgerBackup> {
    await dbInstance.initDatabase()

    const routes = await dbInstance.query('SELECT * FROM routes')
    const customers = await dbInstance.query('SELECT * FROM customers')
    const transactions = await dbInstance.query('SELECT * FROM transactions')
    const purchases = await dbInstance.query('SELECT * FROM purchases')
    const expenses = await dbInstance.query('SELECT * FROM expenses')
    const settings = await dbInstance.query('SELECT * FROM settings')

    // Retrieve business name from settings or default
    const bNameSetting = await settingsRepository.get('business_name')
    const businessName = bNameSetting || 'SaiEggCenter'

    const recordCounts: RecordCounts = {
      routes: routes.length,
      customers: customers.length,
      transactions: transactions.length,
      purchases: purchases.length,
      expenses: expenses.length,
      settings: settings.length,
    }

    const metadata: BackupMetadata = {
      applicationName: 'PoultryLedger',
      applicationVersion: this.CURRENT_APP_VERSION,
      databaseSchemaVersion: this.CURRENT_SCHEMA_VERSION,
      backupTimestamp: new Date().toISOString(),
      businessName,
      generatedBy: 'PoultryLedger',
      recordCounts,
    }

    return {
      metadata,
      data: {
        routes,
        customers,
        transactions,
        purchases,
        expenses,
        settings,
      },
    }
  }

  /**
   * 2. VALIDATION STRATEGY (5-Step Validation)
   * Before touching SQLite, performs exhaustive structure, schema, data type & integrity checks.
   */
  validateBackup(backupData: any): ValidationResult {
    const details: string[] = []

    // Step 1: Validate JSON Structure & Root Metadata
    if (!backupData || typeof backupData !== 'object' || Array.isArray(backupData)) {
      return { valid: false, error: 'Invalid backup file format. Must be a valid JSON object.' }
    }

    const metadata = backupData.metadata
    const data = backupData.data

    if (!metadata || typeof metadata !== 'object') {
      return { valid: false, error: 'Validation Failed: Missing metadata section in backup file.' }
    }

    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Validation Failed: Missing data section in backup file.' }
    }

    // Step 2: Validate Required Tables
    const requiredTables: (keyof RecordCounts)[] = [
      'customers',
      'routes',
      'transactions',
      'expenses',
      'purchases',
      'settings',
    ]

    for (const table of requiredTables) {
      if (!Array.isArray(data[table])) {
        return {
          valid: false,
          error: `Validation Failed: Required table '${table}' is missing or is not an array.`,
        }
      }
    }

    // Step 3: Validate Schema & Version Compatibility
    const schemaVersion = Number(metadata.databaseSchemaVersion || metadata.version || 1)
    if (schemaVersion > this.CURRENT_SCHEMA_VERSION) {
      return {
        valid: false,
        error: `Incompatible Schema Version: Backup version (${schemaVersion}) is newer than current app schema (${this.CURRENT_SCHEMA_VERSION}). Please update the app.`,
      }
    }

    // Step 4: Validate Data Types & Fields
    for (const r of data.routes) {
      if (!r.id || typeof r.id !== 'string' || !r.name || typeof r.name !== 'string') {
        return { valid: false, error: 'Data Type Error: Invalid route record found in backup file.' }
      }
    }

    for (const c of data.customers) {
      if (!c.id || typeof c.id !== 'string' || !c.name || typeof c.name !== 'string' || !c.route_id) {
        return { valid: false, error: 'Data Type Error: Invalid customer record found in backup file.' }
      }
      if (isNaN(Number(c.outstanding_credit))) {
        return { valid: false, error: `Data Type Error: Invalid outstanding credit for customer ${c.name}.` }
      }
    }

    for (const t of data.transactions) {
      if (!t.id || typeof t.id !== 'string' || !t.customer_id || typeof t.customer_id !== 'string' || !t.date) {
        return { valid: false, error: 'Data Type Error: Invalid transaction record found in backup file.' }
      }
      if (isNaN(Number(t.amount_to_be_paid)) || isNaN(Number(t.amount_paid))) {
        return { valid: false, error: `Data Type Error: Invalid numeric monetary values in transaction ${t.id}.` }
      }
    }

    for (const e of data.expenses) {
      if (!e.id || typeof e.id !== 'string' || !e.date || isNaN(Number(e.amount))) {
        return { valid: false, error: 'Data Type Error: Invalid expense record found in backup file.' }
      }
    }

    for (const p of data.purchases) {
      if (!p.id || typeof p.id !== 'string' || !p.date || isNaN(Number(p.total_amount))) {
        return { valid: false, error: 'Data Type Error: Invalid purchase record found in backup file.' }
      }
    }

    // Step 5: Validate Record Integrity & Relationships
    const routeIdSet = new Set(data.routes.map((r: any) => String(r.id)))
    const customerIdSet = new Set(data.customers.map((c: any) => String(c.id)))

    // Primary key uniqueness checks
    if (routeIdSet.size !== data.routes.length) {
      return { valid: false, error: 'Integrity Error: Duplicate Route IDs found in backup file.' }
    }
    if (customerIdSet.size !== data.customers.length) {
      return { valid: false, error: 'Integrity Error: Duplicate Customer IDs found in backup file.' }
    }

    // Check foreign keys in transactions
    for (const t of data.transactions) {
      if (!customerIdSet.has(String(t.customer_id))) {
        details.push(`Orphan Transaction: Transaction ${t.id} references missing customer_id '${t.customer_id}'.`)
      }
    }

    // Normalize Metadata for Preview
    const normalizedMetadata: BackupMetadata = {
      applicationVersion: metadata.applicationVersion || metadata.appName || '1.0.0',
      databaseSchemaVersion: schemaVersion,
      backupTimestamp: metadata.backupTimestamp || metadata.timestamp || new Date().toISOString(),
      businessName: metadata.businessName || metadata.appName || 'SaiEggCenter',
      recordCounts: {
        routes: data.routes.length,
        customers: data.customers.length,
        transactions: data.transactions.length,
        expenses: data.expenses.length,
        purchases: data.purchases.length,
        settings: data.settings.length,
      },
    }

    return {
      valid: true,
      metadata: normalizedMetadata,
      details: details.length > 0 ? details : undefined,
    }
  }

  /**
   * 3. VERIFICATION STRATEGY
   * Queries SQLite directly to verify restored record counts match expected backup counts.
   */
  async verifyRestoration(expectedCounts: RecordCounts): Promise<VerificationResult> {
    await dbInstance.initDatabase()

    const routes = await dbInstance.query('SELECT COUNT(*) AS cnt FROM routes')
    const customers = await dbInstance.query('SELECT COUNT(*) AS cnt FROM customers')
    const transactions = await dbInstance.query('SELECT COUNT(*) AS cnt FROM transactions')
    const purchases = await dbInstance.query('SELECT COUNT(*) AS cnt FROM purchases')
    const expenses = await dbInstance.query('SELECT COUNT(*) AS cnt FROM expenses')
    const settings = await dbInstance.query('SELECT COUNT(*) AS cnt FROM settings')

    const actualCounts: RecordCounts = {
      routes: Number(routes[0]?.cnt ?? routes.length),
      customers: Number(customers[0]?.cnt ?? customers.length),
      transactions: Number(transactions[0]?.cnt ?? transactions.length),
      purchases: Number(purchases[0]?.cnt ?? purchases.length),
      expenses: Number(expenses[0]?.cnt ?? expenses.length),
      settings: Number(settings[0]?.cnt ?? settings.length),
    }

    const isMatch =
      actualCounts.routes === expectedCounts.routes &&
      actualCounts.customers === expectedCounts.customers &&
      actualCounts.transactions === expectedCounts.transactions &&
      actualCounts.purchases === expectedCounts.purchases &&
      actualCounts.expenses === expectedCounts.expenses &&
      actualCounts.settings === expectedCounts.settings

    if (!isMatch) {
      return {
        verified: false,
        error: `Verification mismatch: Expected ${JSON.stringify(expectedCounts)} but found ${JSON.stringify(actualCounts)} in SQLite database.`,
        actualCounts,
        expectedCounts,
      }
    }

    return {
      verified: true,
      actualCounts,
      expectedCounts,
    }
  }

  /**
   * 4. RESTORE & ROLLBACK STRATEGY
   * Takes pre-restore in-memory snapshot of current SQLite DB.
   * Restores within transaction block.
   * Performs post-restore verification.
   * Automatically rolls back to snapshot if restore or verification fails.
   */
  async restoreBackup(backupData: PoultryLedgerBackup): Promise<{ success: boolean; message: string }> {
    const validation = this.validateBackup(backupData)
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Validation failed.' }
    }

    await dbInstance.initDatabase()

    // ── SAFETY: STEP A - Create Temporary Backup Snapshot of Current Database ──
    let snapshot: PoultryLedgerBackup | null = null
    try {
      snapshot = await this.createBackup()
    } catch (snapErr) {
      console.warn('[BackupService] Pre-restore snapshot creation failed:', snapErr)
    }

    // ── STEP B - Perform Atomic Restoration inside ONE transaction ──
    try {
      await dbInstance.beginTransaction()

      // Clear existing records in reverse dependency order
      await dbInstance.execute('DELETE FROM transactions;')
      await dbInstance.execute('DELETE FROM purchases;')
      await dbInstance.execute('DELETE FROM expenses;')
      await dbInstance.execute('DELETE FROM customers;')
      await dbInstance.execute('DELETE FROM routes;')
      await dbInstance.execute('DELETE FROM settings;')

      const now = new Date().toISOString()

      // 1. Insert Business Profile & Settings
      const settingsMap: Map<string, { key: string; value: string; created_at: string; updated_at: string }> = new Map()

      // Insert Business Profile defaults from backup metadata
      if (backupData.metadata?.businessName) {
        settingsMap.set('business_name', {
          key: 'business_name',
          value: String(backupData.metadata.businessName),
          created_at: now,
          updated_at: now,
        })
      }
      settingsMap.set('business_profile_configured', {
        key: 'business_profile_configured',
        value: 'true',
        created_at: now,
        updated_at: now,
      })

      // Insert all settings provided in backup data
      for (const s of backupData.data.settings || []) {
        settingsMap.set(s.key, {
          key: s.key,
          value: String(s.value ?? ''),
          created_at: s.created_at || now,
          updated_at: s.updated_at || now,
        })
      }

      for (const s of settingsMap.values()) {
        await dbInstance.execute(
          'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?);',
          [s.key, s.value, s.created_at, s.updated_at]
        )
      }

      // 2. Insert Routes
      for (const r of backupData.data.routes || []) {
        await dbInstance.execute(
          'INSERT INTO routes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);',
          [r.id, r.name, r.created_at || now, r.updated_at || now]
        )
      }

      // 3. Insert Customers
      for (const c of backupData.data.customers || []) {
        await dbInstance.execute(
          'INSERT INTO customers (id, name, subtitle, route_id, opening_credit, outstanding_credit, opening_credit_created_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            c.id,
            c.name,
            c.subtitle || '',
            c.route_id,
            c.opening_credit || 0,
            c.outstanding_credit || 0,
            c.opening_credit_created_at || null,
            c.created_at || now,
            c.updated_at || now,
          ]
        )
      }

      // 4. Insert Purchases
      for (const p of backupData.data.purchases || []) {
        await dbInstance.execute(
          'INSERT INTO purchases (id, date, time, trays, total_eggs, egg_type, rate_per_100, total_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            p.id,
            p.date,
            p.time || '',
            p.trays || 0,
            p.total_eggs || 0,
            p.egg_type || 'normal',
            p.rate_per_100 || 0,
            p.total_amount || 0,
            p.created_at || now,
            p.updated_at || now,
          ]
        )
      }

      // 5. Insert Transactions
      for (const t of backupData.data.transactions || []) {
        await dbInstance.execute(
          'INSERT INTO transactions (id, customer_id, type, date, time, trays, amount_to_be_paid, amount_paid, payment_method, credit_kept_today, credit_change, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            t.id,
            t.customer_id,
            t.type || 'sale',
            t.date,
            t.time || '',
            t.trays || 0,
            t.amount_to_be_paid || 0,
            t.amount_paid || 0,
            t.payment_method || 'cash',
            t.credit_kept_today || 0,
            t.credit_change || 0,
            t.notes || '',
            t.created_at || now,
            t.updated_at || now,
          ]
        )
      }

      // 6. Insert Expenses
      for (const e of backupData.data.expenses || []) {
        await dbInstance.execute(
          'INSERT INTO expenses (id, date, time, amount, purpose, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [
            e.id,
            e.date,
            e.time || '',
            e.amount || 0,
            e.purpose || '',
            e.payment_method || 'cash',
            e.created_at || now,
            e.updated_at || now,
          ]
        )
      }

      // ── STEP C - Perform Post-Restore Verification ──
      const verification = await this.verifyRestoration(validation.metadata!.recordCounts)
      if (!verification.verified) {
        throw new Error(verification.error || 'Verification check failed after database restore.')
      }

      // ── STEP D - Commit Transaction ──
      await dbInstance.commitTransaction()

      await this.recordBackupEvent('restore')

      return { success: true, message: 'Restore Successful' }
    } catch (err: any) {
      const rootError = err?.message || String(err || 'Unknown database restoration error.')
      console.error('[BackupService] Restore error encountered. Triggering rollback:', rootError)

      try {
        await dbInstance.rollbackTransaction()
      } catch (rollbackSqlErr) {
        console.error('[BackupService] Error rolling back transaction:', rollbackSqlErr)
      }

      // ── SAFETY: STEP E - Automatic Rollback to Pre-Restore Snapshot ──
      if (snapshot) {
        try {
          await this.restoreBackupWithoutSnapshot(snapshot)
          return {
            success: false,
            message: `Restore failed (${rootError}). Automatic rollback successful: Your original data has been completely restored.`,
          }
        } catch (rollbackErr) {
          console.error('[BackupService] Critical: Rollback failed:', rollbackErr)
        }
      }

      return {
        success: false,
        message: `Restore failed: ${rootError}`,
      }
    }
  }

  /**
   * Internal helper for direct rollback without recursion
   */
  private async restoreBackupWithoutSnapshot(backupData: PoultryLedgerBackup): Promise<void> {
    try {
      await dbInstance.beginTransaction()
      await dbInstance.execute('DELETE FROM transactions;')
      await dbInstance.execute('DELETE FROM purchases;')
      await dbInstance.execute('DELETE FROM expenses;')
      await dbInstance.execute('DELETE FROM customers;')
      await dbInstance.execute('DELETE FROM routes;')
      await dbInstance.execute('DELETE FROM settings;')

      const now = new Date().toISOString()

      for (const r of backupData.data.routes || []) {
        await dbInstance.execute(
          'INSERT INTO routes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);',
          [r.id, r.name, r.created_at || now, r.updated_at || now]
        )
      }

      for (const c of backupData.data.customers || []) {
        await dbInstance.execute(
          'INSERT INTO customers (id, name, subtitle, route_id, opening_credit, outstanding_credit, opening_credit_created_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [c.id, c.name, c.subtitle || '', c.route_id, c.opening_credit || 0, c.outstanding_credit || 0, c.opening_credit_created_at || null, c.created_at || now, c.updated_at || now]
        )
      }

      for (const p of backupData.data.purchases || []) {
        await dbInstance.execute(
          'INSERT INTO purchases (id, date, time, trays, total_eggs, egg_type, rate_per_100, total_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            p.id,
            p.date,
            p.time || '',
            p.trays || 0,
            p.total_eggs || 0,
            p.egg_type || 'normal',
            p.rate_per_100 || 0,
            p.total_amount || 0,
            p.created_at || now,
            p.updated_at || now,
          ]
        )
      }

      for (const e of backupData.data.expenses || []) {
        await dbInstance.execute(
          'INSERT INTO expenses (id, date, time, amount, purpose, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [
            e.id,
            e.date,
            e.time || '',
            e.amount || 0,
            e.purpose || '',
            e.payment_method || 'cash',
            e.created_at || now,
            e.updated_at || now,
          ]
        )
      }

      for (const t of backupData.data.transactions || []) {
        await dbInstance.execute(
          'INSERT INTO transactions (id, customer_id, type, date, time, trays, amount_to_be_paid, amount_paid, payment_method, credit_kept_today, credit_change, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            t.id,
            t.customer_id,
            t.type || 'sale',
            t.date,
            t.time || '',
            t.trays || 0,
            t.amount_to_be_paid || 0,
            t.amount_paid || 0,
            t.payment_method || 'cash',
            t.credit_kept_today || 0,
            t.credit_change || 0,
            t.notes || '',
            t.created_at || now,
            t.updated_at || now,
          ]
        )
      }

      for (const s of backupData.data.settings || []) {
        await dbInstance.execute(
          'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?);',
          [s.key, String(s.value ?? ''), s.created_at || now, s.updated_at || now]
        )
      }

      await dbInstance.commitTransaction()
    } catch (err) {
      try {
        await dbInstance.rollbackTransaction()
      } catch (_) {}
      throw err
    }
  }

  /**
   * Records backup/restore event in SQLite settings
   */
  async recordBackupEvent(type: 'backup' | 'restore', fileSize?: number): Promise<void> {
    const now = new Date().toISOString()
    if (type === 'backup') {
      await settingsRepository.set('last_backup_time', now)
      if (fileSize !== undefined) {
        await settingsRepository.set('last_backup_size', String(fileSize))
      }
    } else if (type === 'restore') {
      await settingsRepository.set('last_restore_time', now)
    }
  }

  /**
   * Retrieves backup health status from SQLite settings
   */
  async getBackupHealth(): Promise<BackupHealth> {
    const lastBackupTime = await settingsRepository.get('last_backup_time')
    const lastRestoreTime = await settingsRepository.get('last_restore_time')
    const sizeStr = await settingsRepository.get('last_backup_size')
    const backupSize = sizeStr ? parseInt(sizeStr, 10) : null

    let daysSinceLastBackup = 0
    let needsReminder = false

    if (lastBackupTime) {
      const lastDate = new Date(lastBackupTime).getTime()
      const nowDate = new Date().getTime()
      const diffMs = nowDate - lastDate
      daysSinceLastBackup = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      if (daysSinceLastBackup > 30) {
        needsReminder = true
      }
    } else {
      // If no backup was ever performed, check if app has data
      try {
        await dbInstance.initDatabase()
        const txCountRes = await dbInstance.query<{ count: number }>('SELECT COUNT(*) as count FROM transactions')
        const count = txCountRes[0]?.count || 0
        if (count > 0) {
          daysSinceLastBackup = 31
          needsReminder = true
        }
      } catch (_) {}
    }

    return {
      lastBackupTime,
      lastRestoreTime,
      backupSize,
      daysSinceLastBackup,
      needsReminder,
    }
  }

  /**
   * Helper to trigger saving/downloading of backup file
   */
  async downloadBackupFile(backup: PoultryLedgerBackup): Promise<FileActionResult> {
    const filename = fileService.isAndroid()
      ? fileService.formatBackupFilename()
      : this.getBackupFilename(backup.metadata.businessName)

    const jsonStr = JSON.stringify(backup, null, 2)
    const approximateSize = new Blob([jsonStr]).size
    await this.recordBackupEvent('backup', approximateSize)

    return await fileService.saveBackupJson(backup, filename)
  }
}

export const backupService = new BackupService()
