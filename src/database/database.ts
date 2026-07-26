import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { INITIAL_SCHEMA_SQL } from './migrations/schema'

export const DB_NAME = 'poultryledger.db'

class WebInMemoryDB {
  private tables: Record<string, any[]> = {
    routes: [],
    customers: [],
    transactions: [],
    purchases: [],
    expenses: [],
    settings: [],
  }
  private initialized = false

  private snapshot: Record<string, any[]> | null = null

  init() {
    if (this.initialized) return
    const saved = localStorage.getItem('poultryledger_web_db')
    if (saved) {
      try {
        this.tables = JSON.parse(saved)
      } catch {
        this.tables = { routes: [], customers: [], transactions: [], purchases: [], expenses: [], settings: [] }
      }
    }
    this.initialized = true
  }

  save() {
    localStorage.setItem('poultryledger_web_db', JSON.stringify(this.tables))
  }

  beginTransaction() {
    this.init()
    this.snapshot = JSON.parse(JSON.stringify(this.tables))
  }

  commitTransaction() {
    this.snapshot = null
    this.save()
  }

  rollbackTransaction() {
    if (this.snapshot) {
      this.tables = JSON.parse(JSON.stringify(this.snapshot))
      this.snapshot = null
      this.save()
    }
  }

  getTable(name: string): any[] {
    this.init()
    return this.tables[name] || []
  }

  setTable(name: string, data: any[]) {
    this.init()
    this.tables[name] = data
    this.save()
  }

  query<T = any>(sql: string, values: any[] = []): T[] {
    this.init()
    const cleanSql = sql.trim().toLowerCase()

    if (cleanSql.includes('from customers')) {
      let res = [...this.tables.customers]
      if (cleanSql.includes('where id = ?')) {
        res = res.filter(c => String(c.id) === String(values[0]))
      } else if (cleanSql.includes('where route_id = ?')) {
        res = res.filter(c => String(c.route_id) === String(values[0]))
      }
      if (cleanSql.includes('order by name asc')) {
        res.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }
      return res as unknown as T[]
    }

    if (cleanSql.includes('from routes')) {
      let res = [...this.tables.routes]
      if (cleanSql.includes('where id = ?')) {
        res = res.filter(r => String(r.id) === String(values[0]))
      }
      if (cleanSql.includes('order by name asc')) {
        res.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }
      return res as unknown as T[]
    }

    if (cleanSql.includes('from transactions')) {
      let res = [...this.tables.transactions]
      if (cleanSql.includes('where customer_id = ?')) {
        res = res.filter(t => String(t.customer_id) === String(values[0]))
      } else if (cleanSql.includes('where id = ?')) {
        res = res.filter(t => String(t.id) === String(values[0]))
      }
      if (cleanSql.includes('order by date desc, time desc')) {
        res.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      }
      return res as unknown as T[]
    }

    if (cleanSql.includes('from purchases')) {
      let res = [...this.tables.purchases]
      if (cleanSql.includes('where id = ?')) {
        res = res.filter(p => String(p.id) === String(values[0]))
      }
      if (cleanSql.includes('order by date desc, time desc')) {
        res.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      }
      return res as unknown as T[]
    }

    if (cleanSql.includes('from expenses')) {
      let res = [...this.tables.expenses]
      if (cleanSql.includes('where id = ?')) {
        res = res.filter(e => String(e.id) === String(values[0]))
      }
      if (cleanSql.includes('order by date desc, time desc')) {
        res.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      }
      return res as unknown as T[]
    }

    if (cleanSql.includes('from settings')) {
      let res = [...this.tables.settings]
      if (cleanSql.includes('where key = ?')) {
        res = res.filter(s => s.key === values[0])
      }
      return res as unknown as T[]
    }

    return []
  }

  execute(sql: string, values: any[] = []): any {
    this.init()
    const cleanSql = sql.trim().toLowerCase()

    if (cleanSql.startsWith('begin') || cleanSql.startsWith('commit') || cleanSql.startsWith('rollback')) {
      return { changes: { changes: 0 } }
    }

    if (cleanSql.startsWith('insert into customers')) {
      const item = {
        id: values[0],
        name: values[1],
        subtitle: values[2],
        route_id: values[3],
        opening_credit: values[4],
        outstanding_credit: values[5],
        created_at: values[6],
        updated_at: values[7],
      }
      this.tables.customers = this.tables.customers.filter(c => String(c.id) !== String(item.id))
      this.tables.customers.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('update customers set')) {
      const id = values[values.length - 1]
      const idx = this.tables.customers.findIndex(c => String(c.id) === String(id))
      if (idx !== -1) {
        this.tables.customers[idx] = {
          ...this.tables.customers[idx],
          name: values[0],
          subtitle: values[1],
          route_id: values[2],
          opening_credit: values[3],
          outstanding_credit: values[4],
          updated_at: values[5],
        }
        this.save()
      }
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from customers')) {
      if (values.length === 0 || !values[0]) {
        this.tables.customers = []
      } else {
        const id = values[0]
        this.tables.customers = this.tables.customers.filter(c => String(c.id) !== String(id))
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('insert into routes')) {
      const item = { id: values[0], name: values[1], created_at: values[2], updated_at: values[3] }
      this.tables.routes = this.tables.routes.filter(r => String(r.id) !== String(item.id))
      this.tables.routes.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('update routes set')) {
      const id = values[2]
      const idx = this.tables.routes.findIndex(r => String(r.id) === String(id))
      if (idx !== -1) {
        this.tables.routes[idx] = { ...this.tables.routes[idx], name: values[0], updated_at: values[1] }
        this.save()
      }
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from routes')) {
      if (values.length === 0 || !values[0]) {
        this.tables.routes = []
      } else {
        const id = values[0]
        this.tables.routes = this.tables.routes.filter(r => String(r.id) !== String(id))
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('insert into transactions')) {
      const item = {
        id: values[0],
        customer_id: values[1],
        type: values[2] || 'sale',
        date: values[3],
        time: values[4],
        trays: values[5],
        amount_to_be_paid: values[6],
        amount_paid: values[7],
        payment_method: values[8],
        credit_kept_today: values[9],
        credit_change: values[10],
        notes: values[11] || '',
        created_at: values[12],
        updated_at: values[13],
      }
      this.tables.transactions = this.tables.transactions.filter(t => String(t.id) !== String(item.id))
      this.tables.transactions.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('update transactions set')) {
      const id = values[values.length - 1]
      const idx = this.tables.transactions.findIndex(t => String(t.id) === String(id))
      if (idx !== -1) {
        this.tables.transactions[idx] = {
          ...this.tables.transactions[idx],
          type: values[0],
          date: values[1],
          time: values[2],
          trays: values[3],
          amount_to_be_paid: values[4],
          amount_paid: values[5],
          payment_method: values[6],
          credit_kept_today: values[7],
          credit_change: values[8],
          notes: values[9],
          updated_at: values[10],
        }
        this.save()
      }
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from transactions')) {
      if (values.length === 0 || !values[0]) {
        this.tables.transactions = []
      } else {
        const id = values[0]
        this.tables.transactions = this.tables.transactions.filter(t => String(t.id) !== String(id))
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('insert into purchases')) {
      const item = {
        id: values[0],
        date: values[1],
        time: values[2],
        trays: values[3],
        total_eggs: values[4],
        egg_type: values[5],
        rate_per_100: values[6],
        total_amount: values[7],
        created_at: values[8],
        updated_at: values[9],
      }
      this.tables.purchases = this.tables.purchases.filter(p => String(p.id) !== String(item.id))
      this.tables.purchases.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('update purchases set')) {
      const id = values[values.length - 1]
      const idx = this.tables.purchases.findIndex(p => String(p.id) === String(id))
      if (idx !== -1) {
        this.tables.purchases[idx] = {
          ...this.tables.purchases[idx],
          date: values[0],
          time: values[1],
          trays: values[2],
          total_eggs: values[3],
          egg_type: values[4],
          rate_per_100: values[5],
          total_amount: values[6],
          updated_at: values[7],
        }
        this.save()
      }
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from purchases')) {
      if (values.length === 0 || !values[0]) {
        this.tables.purchases = []
      } else {
        const id = values[0]
        this.tables.purchases = this.tables.purchases.filter(p => String(p.id) !== String(id))
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('insert into expenses')) {
      const item = {
        id: values[0],
        date: values[1],
        time: values[2],
        amount: values[3],
        purpose: values[4],
        payment_method: values[5],
        created_at: values[6],
        updated_at: values[7],
      }
      this.tables.expenses = this.tables.expenses.filter(e => String(e.id) !== String(item.id))
      this.tables.expenses.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('update expenses set')) {
      const id = values[values.length - 1]
      const idx = this.tables.expenses.findIndex(e => String(e.id) === String(id))
      if (idx !== -1) {
        this.tables.expenses[idx] = {
          ...this.tables.expenses[idx],
          date: values[0],
          time: values[1],
          amount: values[2],
          purpose: values[3],
          payment_method: values[4],
          updated_at: values[5],
        }
        this.save()
      }
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from expenses')) {
      if (values.length === 0 || !values[0]) {
        this.tables.expenses = []
      } else {
        const id = values[0]
        this.tables.expenses = this.tables.expenses.filter(e => String(e.id) !== String(id))
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('insert into settings')) {
      const item = { key: values[0], value: String(values[1] ?? ''), created_at: values[2], updated_at: values[3] }
      this.tables.settings = this.tables.settings.filter(s => s.key !== item.key)
      this.tables.settings.push(item)
      this.save()
      return { changes: { changes: 1 } }
    }

    if (cleanSql.startsWith('delete from settings')) {
      if (values.length === 0 || !values[0]) {
        this.tables.settings = []
      } else {
        const key = values[0]
        this.tables.settings = this.tables.settings.filter(s => s.key !== key)
      }
      this.save()
      return { changes: { changes: 1 } }
    }

    return { changes: { changes: 0 } }
  }
}

export const webDbInstance = new WebInMemoryDB()

class Database {
  private sqliteConnection: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private isInitialized = false
  private initPromise: Promise<boolean> | null = null
  private inTransaction = false

  async initDatabase(): Promise<boolean> {
    if (this.isInitialized) return true
    if (this.initPromise) return this.initPromise

    this.initPromise = this._doInit()
    try {
      return await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private async _doInit(): Promise<boolean> {
    if (this.isInitialized) return true

    try {
      if (Capacitor.isNativePlatform()) {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite)
        const isConn = await this.sqliteConnection.isConnection(DB_NAME, false)
        if (isConn.result) {
          this.db = await this.sqliteConnection.retrieveConnection(DB_NAME, false)
        } else {
          this.db = await this.sqliteConnection.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          )
        }

        await this.db.open()
        await this.db.execute(INITIAL_SCHEMA_SQL)
        try {
          await this.db.execute('ALTER TABLE customers ADD COLUMN opening_credit REAL NOT NULL DEFAULT 0;')
        } catch {
          // Column already exists
        }
        try {
          await this.db.execute("ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'sale';")
        } catch {
          // Column already exists
        }
        try {
          await this.db.execute('ALTER TABLE transactions ADD COLUMN notes TEXT;')
        } catch {
          // Column already exists
        }
        this.isInitialized = true
        return true
      } else {
        webDbInstance.init()
        this.isInitialized = true
        return true
      }
    } catch (err) {
      console.error('[DB] Error initializing database:', err)
      this.isInitialized = false
      return false
    }
  }

  async beginTransaction(): Promise<void> {
    await this.initDatabase()
    if (this.inTransaction) {
      console.warn('[DB] Transaction already in progress. Skipping nested transaction.')
      return
    }

    if (Capacitor.isNativePlatform()) {
      if (this.db) {
        const isTx = await this.db.isTransactionActive()
        if (!isTx.result) {
          await this.db.beginTransaction()
        }
      }
    } else {
      webDbInstance.beginTransaction()
    }
    this.inTransaction = true
  }

  async commitTransaction(): Promise<void> {
    await this.initDatabase()
    if (!this.inTransaction) {
      console.warn('[DB] No active transaction to commit.')
      return
    }

    try {
      if (Capacitor.isNativePlatform()) {
        if (this.db) {
          const isTx = await this.db.isTransactionActive()
          if (isTx.result) {
            await this.db.commitTransaction()
          }
        }
      } else {
        webDbInstance.commitTransaction()
      }
    } finally {
      this.inTransaction = false
    }
  }

  async rollbackTransaction(): Promise<void> {
    await this.initDatabase()
    if (!this.inTransaction) {
      console.warn('[DB] No active transaction to rollback.')
      return
    }

    try {
      if (Capacitor.isNativePlatform()) {
        if (this.db) {
          const isTx = await this.db.isTransactionActive()
          if (isTx.result) {
            await this.db.rollbackTransaction()
          }
        }
      } else {
        webDbInstance.rollbackTransaction()
      }
    } finally {
      this.inTransaction = false
    }
  }

  async isTransactionActive(): Promise<boolean> {
    if (!this.inTransaction) return false
    if (Capacitor.isNativePlatform()) {
      if (!this.db) return false
      const res = await this.db.isTransactionActive()
      return Boolean(res.result)
    }
    return this.inTransaction
  }

  async execute(statement: string, values: any[] = [], transaction?: boolean): Promise<any> {
    await this.initDatabase()
    if (Capacitor.isNativePlatform()) {
      if (!this.db) return null
      // When inside an active manual transaction block, pass transaction = false to db.run
      // so @capacitor-community/sqlite does not attempt to create nested transactions.
      const usePluginTx = transaction !== undefined ? transaction : !this.inTransaction
      return await this.db.run(statement, values, usePluginTx)
    }
    return webDbInstance.execute(statement, values)
  }

  async query<T = any>(statement: string, values: any[] = []): Promise<T[]> {
    await this.initDatabase()
    if (Capacitor.isNativePlatform()) {
      if (!this.db) return []
      const res = await this.db.query(statement, values)
      return (res.values || []) as T[]
    }
    return webDbInstance.query<T>(statement, values)
  }

  getDBConnection(): SQLiteDBConnection | null {
    return this.db
  }
}

export const dbInstance = new Database()
