import { Transaction, TransactionType } from '../types'
import { transactionRepository, TransactionEntity } from '../database'
import { creditService } from './creditService'

export const entityToTransaction = (entity: TransactionEntity): Transaction => ({
  id: entity.id,
  customerId: entity.customer_id,
  type: (entity.type as TransactionType) || 'sale',
  date: entity.date,
  time: entity.time,
  trays: entity.trays,
  amountToBePaid: entity.amount_to_be_paid,
  amountPaid: entity.amount_paid,
  paymentMethod: entity.payment_method as any,
  creditKeptToday: entity.credit_kept_today,
  creditChange: entity.credit_change,
  notes: entity.notes || '',
  createdAt: entity.created_at,
})

class TransactionService {
  async getAllTransactions(): Promise<Transaction[]> {
    const list = await transactionRepository.getAll()
    return list.map(e => entityToTransaction(e))
  }

  async getByCustomerId(customerId: string): Promise<Transaction[]> {
    const list = await transactionRepository.getByCustomerId(customerId)
    return list.map(e => entityToTransaction(e))
  }

  async createTransaction(tx: Transaction, _updatedOutstandingCredit?: number): Promise<Transaction[]> {
    await transactionRepository.create({
      id: tx.id,
      customer_id: tx.customerId,
      type: tx.type || 'sale',
      date: tx.date,
      time: tx.time,
      trays: tx.trays,
      amount_to_be_paid: tx.amountToBePaid,
      amount_paid: tx.amountPaid,
      payment_method: tx.paymentMethod,
      credit_kept_today: tx.creditKeptToday,
      credit_change: tx.creditChange,
      notes: tx.notes || '',
    })

    await creditService.recalculateAndSaveCustomerCredit(tx.customerId)

    return await this.getAllTransactions()
  }

  async updateTransaction(tx: Transaction, _updatedOutstandingCredit?: number): Promise<Transaction[]> {
    await transactionRepository.update(tx.id, {
      type: tx.type || 'sale',
      date: tx.date,
      time: tx.time,
      trays: tx.trays,
      amount_to_be_paid: tx.amountToBePaid,
      amount_paid: tx.amountPaid,
      payment_method: tx.paymentMethod,
      credit_kept_today: tx.creditKeptToday,
      credit_change: tx.creditChange,
      notes: tx.notes || '',
    })

    await creditService.recalculateAndSaveCustomerCredit(tx.customerId)

    return await this.getAllTransactions()
  }

  async deleteTransaction(id: string, customerId: string, _updatedOutstandingCredit?: number): Promise<Transaction[]> {
    await transactionRepository.delete(id)

    await creditService.recalculateAndSaveCustomerCredit(customerId)

    return await this.getAllTransactions()
  }
}

export const transactionService = new TransactionService()
