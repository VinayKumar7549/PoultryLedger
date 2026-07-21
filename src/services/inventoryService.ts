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

  // Total Eggs Purchased = Sum of all purchase records (Number of Trays × 30)
  const totalEggsPurchased = safePurchases.reduce((sum, p) => {
    const trays = Number(p?.trays) || 0
    return sum + (trays * 30)
  }, 0)

  // Total Eggs Sold = Sum of Number of Eggs sold in every transaction
  const totalEggsSold = Object.values(safeCustomers).reduce((sum, c) => {
    const custTx = c?.transactions || []
    return sum + custTx.reduce((tSum, t) => {
      const trays = Number(t?.trays) || 0
      return tSum + Math.round(trays * 30)
    }, 0)
  }, 0)

  // Initial State: If there are no purchases yet: Remaining Eggs = 0, Remaining Trays = 0
  let remainingEggs = 0
  let remainingTrays = 0

  if (safePurchases.length > 0) {
    remainingEggs = totalEggsPurchased - totalEggsSold
    remainingTrays = remainingEggs / 30
  }

  // Safety checks to prevent NaN or undefined values
  if (isNaN(remainingEggs) || remainingEggs === undefined || remainingEggs === null) {
    remainingEggs = 0
  }
  if (isNaN(remainingTrays) || remainingTrays === undefined || remainingTrays === null) {
    remainingTrays = 0
  }

  const todayPurchasesList = safePurchases.filter(p => p?.date === today)
  const todayPurchaseCost = todayPurchasesList.reduce((sum, p) => sum + (Number(p?.totalAmount) || 0), 0)
  const todayPurchasesCount = todayPurchasesList.length

  return {
    remainingEggs,
    remainingTrays,
    todayPurchaseCost,
    todayPurchasesCount,
  }
}
