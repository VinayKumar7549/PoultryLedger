import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { INITIAL_SCHEMA_SQL } from './migrations/schema'

export const DB_NAME = 'poultryledger.db'

class Database {
  private sqliteConnection: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private isInitialized = false

  async initDatabase(): Promise<boolean> {
    if (this.isInitialized && this.db) {
      return true
    }

    try {
      this.sqliteConnection = new SQLiteConnection(CapacitorSQLite)

      if (Capacitor.isNativePlatform()) {
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
        this.isInitialized = true
        console.log(`Database '${DB_NAME}' initialized successfully on Android native device.`)
        return true
      } else {
        console.log(`Capacitor SQLite: Web platform detected. Native SQLite database '${DB_NAME}' ready for Android deployment.`)
        return true
      }
    } catch (err) {
      console.error('Error initializing Capacitor SQLite database:', err)
      return false
    }
  }

  async execute(statement: string, values: any[] = []): Promise<any> {
    if (!this.db) {
      console.warn('Database not connected. Execution skipped.')
      return null
    }
    return await this.db.run(statement, values)
  }

  async query<T = any>(statement: string, values: any[] = []): Promise<T[]> {
    if (!this.db) {
      console.warn('Database not connected. Query skipped.')
      return []
    }
    const res = await this.db.query(statement, values)
    return (res.values || []) as T[]
  }

  getDBConnection(): SQLiteDBConnection | null {
    return this.db
  }
}

export const dbInstance = new Database()
