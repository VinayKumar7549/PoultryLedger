import { Expense } from '../types'
import { expenseRepository, ExpenseEntity } from '../database'

class ExpenseService {
  private entityToDomain(entity: ExpenseEntity): Expense {
    return {
      id: entity.id,
      date: entity.date,
      time: entity.time,
      amount: entity.amount,
      purpose: entity.purpose,
      paymentMethod: entity.payment_method as any,
    }
  }

  async getAllExpenses(): Promise<Expense[]> {
    const list = await expenseRepository.getAll()
    return list.map(e => this.entityToDomain(e))
  }

  async getExpensesByDate(date: string): Promise<Expense[]> {
    const list = await expenseRepository.getByDate(date)
    return list.map(e => this.entityToDomain(e))
  }

  async createExpense(e: Expense): Promise<Expense[]> {
    await expenseRepository.create({
      id: e.id,
      date: e.date,
      time: e.time,
      amount: e.amount,
      purpose: e.purpose,
      payment_method: e.paymentMethod,
    })
    return await this.getAllExpenses()
  }

  async updateExpense(e: Expense): Promise<Expense[]> {
    await expenseRepository.update(e.id, {
      date: e.date,
      time: e.time,
      amount: e.amount,
      purpose: e.purpose,
      payment_method: e.paymentMethod,
    })
    return await this.getAllExpenses()
  }

  async deleteExpense(id: string): Promise<Expense[]> {
    await expenseRepository.delete(id)
    return await this.getAllExpenses()
  }
}

export const expenseService = new ExpenseService()
