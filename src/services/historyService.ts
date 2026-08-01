import { Transaction, Expense, EggPurchase } from '../types'
import { expenseRepository, purchaseRepository } from '../database'
import { dbInstance } from '../database/database'
import { entityToTransaction } from './transactionService'
import { compareTimestampsDesc } from '../utils/date'

export interface DailyTransactionItem {
  tx: Transaction
  customer: {
    id: string
    name: string
    subtitle: string
  }
}

class HistoryService {
  async getDailyTransactions(date: string): Promise<{
    items: DailyTransactionItem[]
    totalSalesDay: number
    totalPaidDay: number
  }> {
    try {
      await dbInstance.initDatabase()
      const rows = await dbInstance.query(
        `SELECT 
          t.id, t.customer_id, t.type, t.date, t.time, t.trays, t.amount_to_be_paid, t.amount_paid, 
          t.payment_method, t.credit_kept_today, t.credit_change, t.notes, t.created_at,
          c.name AS customer_name, c.subtitle AS customer_subtitle
         FROM transactions t
         LEFT JOIN customers c ON t.customer_id = c.id
         WHERE t.date = ?
         ORDER BY t.created_at DESC`,
        [date]
      )

      let totalSalesDay = 0
      let totalPaidDay = 0

      const items: DailyTransactionItem[] = rows.map(r => {
        const tx = entityToTransaction({
          id: r.id,
          customer_id: r.customer_id,
          type: r.type,
          date: r.date,
          time: r.time,
          trays: r.trays,
          amount_to_be_paid: r.amount_to_be_paid,
          amount_paid: r.amount_paid,
          payment_method: r.payment_method,
          credit_kept_today: r.credit_kept_today,
          credit_change: r.credit_change,
          notes: r.notes,
          created_at: r.created_at,
        })

        totalSalesDay += tx.amountToBePaid || 0
        totalPaidDay += tx.amountPaid || 0

        return {
          tx,
          customer: {
            id: r.customer_id,
            name: r.customer_name || 'Customer',
            subtitle: r.customer_subtitle || '',
          },
        }
      })

      items.sort((a, b) =>
        compareTimestampsDesc(a.tx.date, a.tx.time, b.tx.date, b.tx.time, a.tx.createdAt, b.tx.createdAt)
      )

      return { items, totalSalesDay, totalPaidDay }
    } catch (err) {
      console.error('Error loading daily transactions from SQLite:', err)
      return { items: [], totalSalesDay: 0, totalPaidDay: 0 }
    }
  }

  async getDailyExpenses(date: string): Promise<{
    expenses: Expense[]
    totalExpenseDay: number
  }> {
    try {
      await dbInstance.initDatabase()
      const list = await expenseRepository.getByDate(date)
      const expenses: Expense[] = list.map(e => ({
        id: e.id,
        date: e.date,
        time: e.time,
        amount: e.amount,
        purpose: e.purpose,
        paymentMethod: e.payment_method as any,
      }))

      const totalExpenseDay = expenses.reduce((sum, e) => sum + e.amount, 0)
      return { expenses, totalExpenseDay }
    } catch (err) {
      console.error('Error loading daily expenses from SQLite:', err)
      return { expenses: [], totalExpenseDay: 0 }
    }
  }

  async getPurchaseHistory(): Promise<EggPurchase[]> {
    try {
      await dbInstance.initDatabase()
      const list = await purchaseRepository.getAll()
      return list.map(p => ({
        id: p.id,
        date: p.date,
        time: p.time,
        trays: p.trays,
        totalEggs: p.total_eggs,
        eggType: p.egg_type as any,
        ratePer100: p.rate_per_100,
        totalAmount: p.total_amount,
      }))
    } catch (err) {
      console.error('Error loading purchase history from SQLite:', err)
      return []
    }
  }
}

export const historyService = new HistoryService()
