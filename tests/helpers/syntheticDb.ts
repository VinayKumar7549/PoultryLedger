import { DatabaseSync } from "node:sqlite"
import { INITIAL_SCHEMA_SQL } from "../../src/database/migrations/schema"
import { dbInstance, IDatabaseAdapter } from "../../src/database/database"

export class SyntheticSqliteHarness implements IDatabaseAdapter {
  private db: DatabaseSync
  private inTransaction = false

  constructor() {
    // Strictly in-memory SQLite database.
    // Guaranteed isolated from filesystem, zero risk of touching poultryledger.db.
    this.db = new DatabaseSync(":memory:")
    this.initSchema()
  }

  private initSchema() {
    this.db.exec("PRAGMA foreign_keys = OFF;")
    this.db.exec(INITIAL_SCHEMA_SQL)
  }

  reset() {
    this.db.exec("PRAGMA foreign_keys = OFF;")
    // Clear all synthetic tables
    this.db.exec(`
      DELETE FROM transactions;
      DELETE FROM purchases;
      DELETE FROM expenses;
      DELETE FROM customers;
      DELETE FROM routes;
      DELETE FROM settings;
    `)
    this.inTransaction = false
  }

  enableForeignKeys(enable = true) {
    this.db.exec(`PRAGMA foreign_keys = ${enable ? "ON" : "OFF"};`)
  }

  async beginTransaction(): Promise<void> {
    if (this.inTransaction) {
      return
    }
    this.db.exec("BEGIN TRANSACTION;")
    this.inTransaction = true
  }

  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      return
    }
    this.db.exec("COMMIT;")
    this.inTransaction = false
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.inTransaction) {
      return
    }
    this.db.exec("ROLLBACK;")
    this.inTransaction = false
  }

  async isTransactionActive(): Promise<boolean> {
    return this.inTransaction
  }

  async execute(statement: string, values: any[] = []): Promise<any> {
    const trimmed = statement.trim()
    if (!values || values.length === 0) {
      this.db.exec(trimmed)
      return { changes: { changes: 0 } }
    }
    const stmt = this.db.prepare(trimmed)
    const result = stmt.run(...values)
    return { changes: { changes: Number(result.changes || 0) } }
  }

  async query<T = any,>(statement: string, values: any[] = []): Promise<T[]> {
    const trimmed = statement.trim()
    const stmt = this.db.prepare(trimmed)
    const rows = values && values.length > 0 ? stmt.all(...values) : stmt.all()
    // Map null-prototype objects from node:sqlite to standard JS objects
    return rows.map((r: any) => ({ ...r })) as T[]
  }

  /**
   * Directly execute SQL on the synthetic database for test assertions.
   */
  rawExec(sql: string) {
    return this.db.exec(sql)
  }

  rawQuery<T = any,>(sql: string, ...params: any[]): T[] {
    const stmt = this.db.prepare(sql)
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all()
    return rows.map((r: any) => ({ ...r })) as T[]
  }
}

/**
 * Global test helper to activate the safe synthetic harness on dbInstance
 */
let activeHarness: SyntheticSqliteHarness | null = null

export function setupSyntheticTestDb(): SyntheticSqliteHarness {
  if (!activeHarness) {
    activeHarness = new SyntheticSqliteHarness()
  } else {
    activeHarness.reset()
  }
  dbInstance.setCustomAdapter(activeHarness)
  return activeHarness
}

export function teardownSyntheticTestDb() {
  if (activeHarness) {
    activeHarness.reset()
    activeHarness = null
  }
  dbInstance.setCustomAdapter(null)
}
