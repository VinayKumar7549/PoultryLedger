import { transactionRepository, customerRepository } from '../database'
import { dbInstance } from '../database/database'
import { entityToTransaction } from './transactionService'
import { Transaction } from '../types'
import { today } from '../utils/date'

export interface CreditTimelineEntry {
  tx: Transaction
  updatedOutstanding: number
  creditAdded: number
  creditReduced: number
  isOpeningBalance?: boolean
}

function parseCreatedAtDate(createdAt?: string): { date: string; time: string } {
  if (!createdAt) {
    return { date: today, time: '00:00' }
  }
  let dateStr = today
  let timeStr = '00:00'

  if (createdAt.includes('T')) {
    const parts = createdAt.split('T')
    dateStr = parts[0]
    if (parts[1]) timeStr = parts[1].substring(0, 5)
  } else if (createdAt.includes(' ')) {
    const parts = createdAt.split(' ')
    dateStr = parts[0]
    if (parts[1]) timeStr = parts[1].substring(0, 5)
  } else if (createdAt.length >= 10) {
    dateStr = createdAt.substring(0, 10)
  }

  return { date: dateStr, time: timeStr }
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
      const custEntity = await customerRepository.getById(customerId)
      const txEntities = await transactionRepository.getCreditTransactionsByCustomerId(customerId)
      const transactions = txEntities.map(e => entityToTransaction(e))

      const openingCredit = Number(custEntity?.opening_credit) || 0

      // Add Opening Balance transaction if openingCredit > 0
      if (custEntity && openingCredit > 0) {
        const { date: openingDate, time: openingTime } = parseCreatedAtDate(custEntity.created_at)
        const openingTx: Transaction = {
          id: `opening-${customerId}`,
          customerId,
          type: 'sale',
          date: openingDate,
          time: openingTime,
          trays: 0,
          amountToBePaid: openingCredit,
          amountPaid: 0,
          paymentMethod: 'cash',
          creditKeptToday: openingCredit,
          creditChange: -openingCredit,
          notes: 'Opening Balance Created',
        }
        transactions.push(openingTx)
      }

      // Sort newest transaction first (Date DESC, Time DESC)
      transactions.sort((a, b) => {
        const dateTimeA = `${a.date || ''} ${a.time || ''}`
        const dateTimeB = `${b.date || ''} ${b.time || ''}`
        return dateTimeB.localeCompare(dateTimeA)
      })

      let runningCredit = currentOutstanding
      const historyEntries: CreditTimelineEntry[] = []

      for (const tx of transactions) {
        const isOpening = tx.id.startsWith('opening-')
        const creditAdded = isOpening ? openingCredit : (tx.creditKeptToday || Math.max(0, tx.amountToBePaid - tx.amountPaid))
        const creditReduced = isOpening ? 0 : Math.max(0, tx.amountPaid - tx.amountToBePaid)
        const netCreditChange = creditAdded - creditReduced

        if (isOpening || creditAdded > 0 || creditReduced > 0 || Math.abs(netCreditChange) > 0) {
          const entryOutstanding = runningCredit
          runningCredit = Math.max(0, runningCredit - netCreditChange)

          historyEntries.push({
            tx,
            updatedOutstanding: entryOutstanding,
            creditAdded,
            creditReduced,
            isOpeningBalance: isOpening,
          })
        }
      }

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
