import { dbInstance } from '../database'

export interface SettingEntity {
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

export class SettingsRepository {
  async getAll(): Promise<SettingEntity[]> {
    return await dbInstance.query<SettingEntity>('SELECT * FROM settings ORDER BY key ASC')
  }

  async get(key: string): Promise<string | null> {
    const res = await dbInstance.query<SettingEntity>('SELECT * FROM settings WHERE key = ?', [key])
    return res[0] ? res[0].value : null
  }

  async set(key: string, value: string): Promise<void> {
    const now = new Date().toISOString()
    const existing = await this.get(key)
    if (existing !== null) {
      await dbInstance.execute(
        'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
        [value, now, key]
      )
    } else {
      await dbInstance.execute(
        'INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [key, value, now, now]
      )
    }
  }

  async delete(key: string): Promise<void> {
    await dbInstance.execute('DELETE FROM settings WHERE key = ?', [key])
  }
}

export const settingsRepository = new SettingsRepository()
