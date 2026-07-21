import { Customer, Expense, EggPurchase, Transaction } from '../types'
import { today, getPrevMonthStr } from '../utils/date'

export interface BusinessSummaryMetrics {
  todaySales: number
  todayCreditGiven: number
  totalOutstandingCredit: number
  todayGrossProfit: number
  lastMonthGrossProfit: number
  lastMonthOutstandingCredit: number
}

export const calculateBusinessSummary = (
  customers: Record<string, Customer>,
  expenses: Expense[],
  purchases: EggPurchase[]
): BusinessSummaryMetrics => {
  const safePurchases = purchases || []
  const safeCustomers = customers || {}
  const safeExpenses = expenses || []

  const allTx: Transaction[] = Object.values(safeCustomers).flatMap(c => c.transactions || [])

  const todaySales = allTx.filter(t => t.date === today).reduce((sum, t) => sum + (t.amountToBePaid || 0), 0)
  const todayCreditGiven = allTx.filter(t => t.date === today).reduce((sum, t) => sum + (t.creditKeptToday || 0), 0)
  const totalOutstandingCredit = Object.values(safeCustomers).reduce((sum, c) => sum + (c.outstandingCredit || 0), 0)
  const todayExpenses = safeExpenses.filter(e => e.date === today).reduce((sum, e) => sum + (e.amount || 0), 0)
  const todayPurchaseCost = safePurchases.filter(p => p.date === today).reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  const todayGrossProfit = todaySales - todayExpenses - todayPurchaseCost

  const currentMonthStr = today.slice(0, 7)
  const lastMonthStr = getPrevMonthStr(currentMonthStr)

  const lastMonthSales = allTx.filter(t => t.date.startsWith(lastMonthStr)).reduce((sum, t) => sum + (t.amountToBePaid || 0), 0)
  const lastMonthExpenses = safeExpenses.filter(e => e.date.startsWith(lastMonthStr)).reduce((sum, e) => sum + (e.amount || 0), 0)
  const lastMonthPurchases = safePurchases.filter(p => p.date.startsWith(lastMonthStr)).reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  const lastMonthGrossProfit = lastMonthSales - lastMonthExpenses - lastMonthPurchases
  const lastMonthOutstandingCredit = allTx.filter(t => t.date.startsWith(lastMonthStr)).reduce((sum, t) => sum + (t.creditKeptToday || 0), 0)

  return {
    todaySales,
    todayCreditGiven,
    totalOutstandingCredit,
    todayGrossProfit,
    lastMonthGrossProfit,
    lastMonthOutstandingCredit,
  }
}
