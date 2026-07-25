import { transactionRepository, customerRepository } from '../database'
import { dbInstance } from '../database/database'
import { entityToTransaction } from './transactionService'
import { Transaction } from '../types'

export interface CreditTimelineEntry {
  tx: Transaction
  updatedOutstanding: number
  creditAdded: number
  creditReduced: number
}

class CreditService {
  async getTotalSystemCredit(): Promise<number> {
    try {
      await dbInstance.initDatabase()
      const res = await dbInstance.query(
        'SELECT COALESCE(SUM(outstanding_credit), 0) AS total_outstanding FROM customers'
      )
      return Number(res[0]?.total_outstanding) || 0
    } catch (err) {
      console.error('Error fetching total system credit:', err)
      return 0
    }
  }

  async getCustomerOutstanding(customerId: string): Promise<number> {
    try {
      await dbInstance.initDatabase()
      const cust = await customerRepository.getById(customerId)
      const opening = cust?.opening_credit || 0
      const res = await dbInstance.query(
        'SELECT COALESCE(SUM(amount_to_be_paid - amount_paid), 0) AS outstanding FROM transactions WHERE customer_id = ?',
        [customerId]
      )
      return opening + (Number(res[0]?.outstanding) || 0)
    } catch (err) {
      console.error('Error fetching customer outstanding credit:', err)
      return 0
    }
  }

  async getCustomerCreditHistory(customerId: string, currentOutstanding: number): Promise<CreditTimelineEntry[]> {
    try {
      await dbInstance.initDatabase()
      const txEntities = await transactionRepository.getByCustomerId(customerId)
      const transactions = txEntities.map(e => entityToTransaction(e))

      transactions.sort((a, b) => {
        const dateTimeA = `${a.date} ${a.time}`
        const dateTimeB = `${b.date} ${b.time}`
        return dateTimeB.localeCompare(dateTimeA)
      })

      let runningCredit = currentOutstanding
      const historyEntries: CreditTimelineEntry[] = transactions.map(tx => {
        const entryOutstanding = runningCredit
        const creditAdded = tx.creditKeptToday || Math.max(0, tx.amountToBePaid - tx.amountPaid)
        const creditReduced = Math.max(0, tx.amountPaid - tx.amountToBePaid)
        const netCreditChange = creditAdded - creditReduced
        runningCredit = Math.max(0, runningCredit - netCreditChange)

        return {
          tx,
          updatedOutstanding: entryOutstanding,
          creditAdded,
          creditReduced,
        }
      })

      return historyEntries
    } catch (err) {
      console.error('Error fetching customer credit history:', err)
      return []
    }
  }

  async recalculateAndSaveCustomerCredit(customerId: string): Promise<number> {
    try {
      const calculatedCredit = await this.getCustomerOutstanding(customerId)
      await customerRepository.update(customerId, {
        outstanding_credit: calculatedCredit,
      })
      return calculatedCredit
    } catch (err) {
      console.error('Error recalculating customer credit:', err)
      return 0
    }
  }
}

export const creditService = new CreditService()
