import { dbInstance } from '../database'

export interface TransactionEntity {
  id: string
  customer_id: string
  date: string
  time: string
  trays: number
  amount_to_be_paid: number
  amount_paid: number
  payment_method: string
  credit_kept_today: number
  credit_change: number
  created_at?: string
  updated_at?: string
}

export class TransactionRepository {
  async getAll(): Promise<TransactionEntity[]> {
    return await dbInstance.query<TransactionEntity>('SELECT * FROM transactions ORDER BY date DESC, time DESC')
  }

  async getById(id: string): Promise<TransactionEntity | null> {
    const res = await dbInstance.query<TransactionEntity>('SELECT * FROM transactions WHERE id = ?', [id])
    return res[0] || null
  }

  async getByCustomerId(customerId: string): Promise<TransactionEntity[]> {
    return await dbInstance.query<TransactionEntity>(
      'SELECT * FROM transactions WHERE customer_id = ? ORDER BY date DESC, time DESC',
      [customerId]
    )
  }

  async getByDate(date: string): Promise<TransactionEntity[]> {
    return await dbInstance.query<TransactionEntity>(
      'SELECT * FROM transactions WHERE date = ? ORDER BY time DESC',
      [date]
    )
  }

  async create(tx: Omit<TransactionEntity, 'created_at' | 'updated_at'>): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      `INSERT INTO transactions 
       (id, customer_id, date, time, trays, amount_to_be_paid, amount_paid, payment_method, credit_kept_today, credit_change, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.customer_id,
        tx.date,
        tx.time,
        tx.trays,
        tx.amount_to_be_paid,
        tx.amount_paid,
        tx.payment_method,
        tx.credit_kept_today,
        tx.credit_change,
        now,
        now,
      ]
    )
  }

  async update(id: string, fields: Partial<Omit<TransactionEntity, 'id'>>): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) return

    const now = new Date().toISOString()
    const updated = { ...existing, ...fields, updated_at: now }

    await dbInstance.execute(
      `UPDATE transactions SET 
       customer_id = ?, date = ?, time = ?, trays = ?, amount_to_be_paid = ?, amount_paid = ?, 
       payment_method = ?, credit_kept_today = ?, credit_change = ?, updated_at = ?
       WHERE id = ?`,
      [
        updated.customer_id,
        updated.date,
        updated.time,
        updated.trays,
        updated.amount_to_be_paid,
        updated.amount_paid,
        updated.payment_method,
        updated.credit_kept_today,
        updated.credit_change,
        now,
        id,
      ]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM transactions WHERE id = ?', [id])
  }
}

export const transactionRepository = new TransactionRepository()
