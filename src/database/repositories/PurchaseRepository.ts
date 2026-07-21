import { dbInstance } from '../database'

export interface PurchaseEntity {
  id: string
  date: string
  time: string
  trays: number
  total_eggs: number
  egg_type: string
  rate_per_100: number
  total_amount: number
  created_at?: string
  updated_at?: string
}

export class PurchaseRepository {
  async getAll(): Promise<PurchaseEntity[]> {
    return await dbInstance.query<PurchaseEntity>('SELECT * FROM purchases ORDER BY date DESC, time DESC')
  }

  async getById(id: string): Promise<PurchaseEntity | null> {
    const res = await dbInstance.query<PurchaseEntity>('SELECT * FROM purchases WHERE id = ?', [id])
    return res[0] || null
  }

  async getByDate(date: string): Promise<PurchaseEntity[]> {
    return await dbInstance.query<PurchaseEntity>(
      'SELECT * FROM purchases WHERE date = ? ORDER BY time DESC',
      [date]
    )
  }

  async create(p: Omit<PurchaseEntity, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      `INSERT INTO purchases
       (id, date, time, trays, total_eggs, egg_type, rate_per_100, total_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id,
        p.date,
        p.time,
        p.trays,
        p.total_eggs,
        p.egg_type,
        p.rate_per_100,
        p.total_amount,
        now,
        now,
      ]
    )
  }

  async update(id: string, fields: Partial<Omit<PurchaseEntity, 'id'>>): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) return

    const now = new Date().toISOString()
    const updated = { ...existing, ...fields, updated_at: now }

    await dbInstance.execute(
      `UPDATE purchases SET
       date = ?, time = ?, trays = ?, total_eggs = ?, egg_type = ?, rate_per_100 = ?, total_amount = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.date,
        updated.time,
        updated.trays,
        updated.total_eggs,
        updated.egg_type,
        updated.rate_per_100,
        updated.total_amount,
        now,
        id,
      ]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM purchases WHERE id = ?', [id])
  }
}

export const purchaseRepository = new PurchaseRepository()
