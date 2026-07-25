import { today } from '../utils/date'
import { dbInstance } from '../database/database'

export interface InventoryMetrics {
  remainingEggs: number
  remainingTrays: number
  todayPurchaseCost: number
  todayPurchasesCount: number
}

export async function getSQLiteInventoryMetrics(): Promise<InventoryMetrics> {
  try {
    await dbInstance.initDatabase()

    const purchaseRes = await dbInstance.query(
      `SELECT COALESCE(SUM(trays * 30), 0) AS total_eggs_purchased, COUNT(*) AS purchase_count FROM purchases`
    )
    const totalEggsPurchased = Number(purchaseRes[0]?.total_eggs_purchased) || 0
    const purchaseCount = Number(purchaseRes[0]?.purchase_count) || 0

    const txRes = await dbInstance.query(
      `SELECT COALESCE(SUM(ROUND(trays * 30)), 0) AS total_eggs_sold FROM transactions`
    )
    const totalEggsSold = Number(txRes[0]?.total_eggs_sold) || 0

    const todayRes = await dbInstance.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS today_purchase_cost, COUNT(*) AS today_purchases_count FROM purchases WHERE date = ?`,
      [today]
    )
    const todayPurchaseCost = Number(todayRes[0]?.today_purchase_cost) || 0
    const todayPurchasesCount = Number(todayRes[0]?.today_purchases_count) || 0

    let remainingEggs = 0
    let remainingTrays = 0

    if (purchaseCount > 0) {
      remainingEggs = totalEggsPurchased - totalEggsSold
      remainingTrays = remainingEggs / 30
    }

    if (isNaN(remainingEggs) || remainingEggs === undefined || remainingEggs === null) {
      remainingEggs = 0
    }
    if (isNaN(remainingTrays) || remainingTrays === undefined || remainingTrays === null) {
      remainingTrays = 0
    }

    return {
      remainingEggs,
      remainingTrays,
      todayPurchaseCost,
      todayPurchasesCount,
    }
  } catch (err) {
    console.error('Error fetching SQLite inventory metrics:', err)
    return {
      remainingEggs: 0,
      remainingTrays: 0,
      todayPurchaseCost: 0,
      todayPurchasesCount: 0,
    }
  }
}
