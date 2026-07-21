import { Customer, EggPurchase } from '../types'
import { today } from '../utils/date'

export interface InventoryMetrics {
  remainingEggs: number
  remainingTrays: number
  todayPurchaseCost: number
  todayPurchasesCount: number
}

export const calculateInventoryMetrics = (
  purchases: EggPurchase[],
  customers: Record<string, Customer>
): InventoryMetrics => {
  const safePurchases = purchases || []
  const safeCustomers = customers || {}

  const totalEggsPurchased = safePurchases.reduce((sum, p) => sum + (p.totalEggs || 0), 0)
  const totalEggsSold = Object.values(safeCustomers).reduce((sum, c) => {
    return sum + (c.transactions || []).reduce((tSum, t) => tSum + (t.trays || 0) * 30, 0)
  }, 0)

  const remainingEggs = Math.max(0, totalEggsPurchased - totalEggsSold)
  const remainingTrays = remainingEggs / 30

  const todayPurchasesList = safePurchases.filter(p => p.date === today)
  const todayPurchaseCost = todayPurchasesList.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  const todayPurchasesCount = todayPurchasesList.length

  return {
    remainingEggs,
    remainingTrays,
    todayPurchaseCost,
    todayPurchasesCount,
  }
}
