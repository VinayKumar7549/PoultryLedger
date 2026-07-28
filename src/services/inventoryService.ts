import { toIso } from '../utils/date'
import { dbInstance } from '../database/database'
import { Capacitor } from '@capacitor/core'

export interface InventoryMetrics {
  remainingEggs: number
  remainingTrays: number
  todayPurchaseCost: number
  todayPurchasesCount: number
}

export async function getSQLiteInventoryMetrics(): Promise<InventoryMetrics> {
  try {
    await dbInstance.initDatabase()
    const todayStr = toIso(new Date())

    if (!Capacitor.isNativePlatform()) {
      const purchases = await dbInstance.query('SELECT * FROM purchases')
      const txs = await dbInstance.query('SELECT * FROM transactions')

      let totalEggsPurchased = 0
      let todayPurchaseCost = 0
      let todayPurchasesCount = 0

      for (const p of purchases) {
        const trays = Number(p.trays) || 0
        const cost = Number(p.total_amount) || 0
        totalEggsPurchased += trays * 30

        const pDate = (p.date || '').trim().split('T')[0]
        if (pDate === todayStr) {
          todayPurchaseCost += cost
          todayPurchasesCount++
        }
      }

      let totalEggsSold = 0
      for (const t of txs) {
        totalEggsSold += Math.round((Number(t.trays) || 0) * 30)
      }

      let remainingEggs = 0
      let remainingTrays = 0
      if (purchases.length > 0) {
        remainingEggs = totalEggsPurchased - totalEggsSold
        remainingTrays = remainingEggs / 30
      }

      return {
        remainingEggs: Math.max(0, remainingEggs),
        remainingTrays: Math.max(0, remainingTrays),
        todayPurchaseCost,
        todayPurchasesCount,
      }
    }

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
      `SELECT COALESCE(SUM(total_amount), 0) AS today_purchase_cost, COUNT(*) AS today_purchases_count FROM purchases WHERE date = ? OR date LIKE ?`,
      [todayStr, `${todayStr}%`]
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
      remainingEggs: Math.max(0, remainingEggs),
      remainingTrays: Math.max(0, remainingTrays),
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
