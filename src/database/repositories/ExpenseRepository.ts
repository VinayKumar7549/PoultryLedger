import { dbInstance } from '../database'
import { compareTimestampsDesc } from '../../utils/date'

export interface ExpenseEntity {
  id: string
  date: string
  time: string
  amount: number
  purpose: string
  payment_method: string
  created_at?: string
  updated_at?: string
}

export class ExpenseRepository {
  async getAll(): Promise<ExpenseEntity[]> {
    const list = await dbInstance.query<ExpenseEntity>('SELECT * FROM expenses ORDER BY date DESC, created_at DESC')
    return list.sort((a, b) => compareTimestampsDesc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))
  }

  async getById(id: string): Promise<ExpenseEntity | null> {
    const res = await dbInstance.query<ExpenseEntity>('SELECT * FROM expenses WHERE id = ?', [id])
    return res[0] || null
  }

  async getByDate(date: string): Promise<ExpenseEntity[]> {
    const list = await dbInstance.query<ExpenseEntity>(
      'SELECT * FROM expenses WHERE date = ? ORDER BY created_at DESC',
      [date]
    )
    return list.sort((a, b) => compareTimestampsDesc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))
  }

  async create(e: Omit<ExpenseEntity, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      `INSERT INTO expenses
       (id, date, time, amount, purpose, payment_method, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.date, e.time, e.amount, e.purpose, e.payment_method, now, now]
    )
  }

  async update(id: string, fields: Partial<Omit<ExpenseEntity, 'id'>>): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) return

    const now = new Date().toISOString()
    const updated = { ...existing, ...fields, updated_at: now }

    await dbInstance.execute(
      `UPDATE expenses SET
       date = ?, time = ?, amount = ?, purpose = ?, payment_method = ?, updated_at = ?
       WHERE id = ?`,
      [updated.date, updated.time, updated.amount, updated.purpose, updated.payment_method, now, id]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM expenses WHERE id = ?', [id])
  }
}

export const expenseRepository = new ExpenseRepository()
