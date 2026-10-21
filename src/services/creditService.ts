import { transactionRepository, customerRepository } from "../database"
import { dbInstance } from "../database/database"
import { entityToTransaction } from "./transactionService"
import { Transaction } from "../types"
import {
  parseOpeningBalanceTimestamp,
  compareTimestampsDesc,
} from "../utils/date"

export interface CreditTimelineEntry {
  tx: Transaction
  updatedOutstanding: number
  creditAdded: number
  creditReduced: number
  isOpeningBalance?: boolean
}

class CreditService {
  async getTotalSystemCredit(): Promise<number> {
    try {
      await dbInstance.initDatabase()
      const res = await dbInstance.query(
        "SELECT COALESCE(SUM(outstanding_credit), 0) AS total_outstanding FROM customers",
      )
      return Number(res[0]?.total_outstanding) || 0
    } catch (err) {
      console.error("Error fetching total system credit:", err)
      return 0
    }
  }

  async getCustomerOutstanding(customerId: string): Promise<number> {
    try {
      await dbInstance.initDatabase()
      const cust = await customerRepository.getById(customerId)
      const opening = cust?.opening_credit || 0
      const res = await dbInstance.query(
        "SELECT COALESCE(SUM(amount_to_be_paid - amount_paid), 0) AS outstanding FROM transactions WHERE customer_id = ?",
        [customerId],
      )
      return opening + (Number(res[0]?.outstanding) || 0)
    } catch (err) {
      console.error("Error fetching customer outstanding credit:", err)
      return 0
    }
  }

  async getCustomerCreditHistory(
    customerId: string,
    currentOutstanding: number,
  ): Promise<CreditTimelineEntry[]> {
    try {
      await dbInstance.initDatabase()
      const custEntity = await customerRepository.getById(customerId)
      const txEntities =
        await transactionRepository.getCreditTransactionsByCustomerId(
          customerId,
        )
      const transactions = txEntities.map((e) => entityToTransaction(e))

      const openingCredit = Number(custEntity?.opening_credit) || 0

      // Sort newest transaction first (Date DESC, Time DESC)
      transactions.sort((a, b) =>
        compareTimestampsDesc(
          a.date,
          a.time,
          b.date,
          b.time,
          a.createdAt,
          b.createdAt,
        ),
      )

      // Add Opening Balance transaction as the oldest anchor if openingCredit > 0 (BUG-13)
      if (custEntity && openingCredit > 0) {
        const timestamp =
          custEntity.opening_credit_created_at || custEntity.created_at
        let { date: openingDate, time: openingTime } =
          parseOpeningBalanceTimestamp(timestamp)
        if (transactions.length > 0) {
          const earliest = transactions[transactions.length - 1]
          if (openingDate > earliest.date) {
            openingDate = earliest.date
            openingTime = "00:00:00"
          }
        }
        const openingTx: Transaction = {
          id: `opening-${customerId}`,
          customerId,
          type: "sale",
          date: openingDate,
          time: openingTime,
          trays: 0,
          amountToBePaid: openingCredit,
          amountPaid: 0,
          paymentMethod: "cash",
          creditKeptToday: openingCredit,
          creditChange: -openingCredit,
          notes: "Opening Balance Created",
        }
        transactions.push(openingTx)
      }

      let runningCredit = currentOutstanding
      const historyEntries: CreditTimelineEntry[] = []

      for (const tx of transactions) {
        const isOpening = tx.id.startsWith("opening-")
        const creditAdded = isOpening
          ? openingCredit
          : tx.creditKeptToday || Math.max(0, tx.amountToBePaid - tx.amountPaid)
        const creditReduced = isOpening
          ? 0
          : Math.max(0, tx.amountPaid - tx.amountToBePaid)
        const netCreditChange = creditAdded - creditReduced

        if (
          isOpening ||
          creditAdded > 0 ||
          creditReduced > 0 ||
          Math.abs(netCreditChange) > 0
        ) {
          const entryOutstanding = runningCredit
          runningCredit = runningCredit - netCreditChange

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
      console.error("Error fetching customer credit history:", err)
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
      console.error("Error recalculating customer credit:", err)
      return 0
    }
  }
}

export const creditService = new CreditService()
