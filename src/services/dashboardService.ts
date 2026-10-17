import { dbInstance } from "../database/database"
import { toIso, getPrevMonthStr } from "../utils/date"
import { getSQLiteInventoryMetrics, InventoryMetrics } from "./inventoryService"
import { Capacitor } from "@capacitor/core"

export interface DashboardMetrics {
  // Sales Summary
  totalSalesAmount: number
  todaySales: number
  todayCreditGiven: number
  totalEggsSold: number
  totalTransactions: number

  // Purchase Summary
  totalPurchaseCost: number
  todayPurchaseCost: number
  totalTraysPurchased: number
  totalEggsPurchased: number

  // Expense Summary
  totalExpenses: number
  todayExpenses: number

  // Credit Summary
  totalOutstandingCredit: number
  pendingCreditCustomersCount: number
  lastMonthOutstandingCredit: number

  // Business Summary / Gross Profit
  todayGrossProfit: number
  lastMonthGrossProfit: number

  // Inventory Summary
  inventory: InventoryMetrics
}

class DashboardService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      await dbInstance.initDatabase()

      const todayStr = toIso(new Date())
      const currentMonthStr = todayStr.slice(0, 7)
      const lastMonthStr = getPrevMonthStr(currentMonthStr)

      if (!Capacitor.isNativePlatform()) {
        // Javascript calculation fallback for web development (npm run dev)
        const txs = await dbInstance.query("SELECT * FROM transactions")
        const purchases = await dbInstance.query("SELECT * FROM purchases")
        const expenses = await dbInstance.query("SELECT * FROM expenses")
        const customers = await dbInstance.query("SELECT * FROM customers")

        let totalSalesAmount = 0
        let todaySales = 0
        let todayCreditGiven = 0
        let lastMonthSales = 0
        let lastMonthOutstandingCredit = 0
        let totalEggsSold = 0
        let totalTransactions = 0

        for (const t of txs) {
          if (t.type === "payment") continue
          totalTransactions++
          const amt = Number(t.amount_to_be_paid) || 0
          const cred = Number(t.credit_kept_today) || 0
          totalSalesAmount += amt
          totalEggsSold += Math.round((Number(t.trays) || 0) * 30)

          const tDate = (t.date || "").trim().split("T")[0]
          if (tDate === todayStr) {
            todaySales += amt
            todayCreditGiven += cred
          } else if (tDate.startsWith(lastMonthStr)) {
            lastMonthSales += amt
            lastMonthOutstandingCredit += cred
          }
        }

        let totalPurchaseCost = 0
        let todayPurchaseCost = 0
        let lastMonthPurchases = 0
        let totalTraysPurchased = 0
        let totalEggsPurchased = 0

        for (const p of purchases) {
          const cost = Number(p.total_amount) || 0
          const trays = Number(p.trays) || 0
          totalPurchaseCost += cost
          totalTraysPurchased += trays
          totalEggsPurchased += trays * 30

          const pDate = (p.date || "").trim().split("T")[0]
          if (pDate === todayStr) {
            todayPurchaseCost += cost
          } else if (pDate.startsWith(lastMonthStr)) {
            lastMonthPurchases += cost
          }
        }

        let totalExpenses = 0
        let todayExpenses = 0
        let lastMonthExpenses = 0

        for (const e of expenses) {
          const amt = Number(e.amount) || 0
          totalExpenses += amt

          const eDate = (e.date || "").trim().split("T")[0]
          if (eDate === todayStr) {
            todayExpenses += amt
          } else if (eDate.startsWith(lastMonthStr)) {
            lastMonthExpenses += amt
          }
        }

        let totalOutstandingCredit = 0
        let pendingCreditCustomersCount = 0

        for (const c of customers) {
          const cred = Number(c.outstanding_credit) || 0
          totalOutstandingCredit += cred
          if (cred > 0) {
            pendingCreditCustomersCount++
          }
        }

        const inventory = await getSQLiteInventoryMetrics()

        const todayGrossProfit = todaySales - todayExpenses - todayPurchaseCost
        const lastMonthGrossProfit =
          lastMonthSales - lastMonthExpenses - lastMonthPurchases

        return {
          totalSalesAmount,
          todaySales,
          todayCreditGiven,
          totalEggsSold,
          totalTransactions,
          totalPurchaseCost,
          todayPurchaseCost,
          totalTraysPurchased,
          totalEggsPurchased,
          totalExpenses,
          todayExpenses,
          totalOutstandingCredit,
          pendingCreditCustomersCount,
          lastMonthOutstandingCredit,
          todayGrossProfit,
          lastMonthGrossProfit,
          inventory,
        }
      }

      const todayLike = `${todayStr}%`
      const lastMonthLike = `${lastMonthStr}%`

      // 1. Sales & Credit from Transactions
      const txRes = await dbInstance.query(
        `SELECT 
          COALESCE(SUM(amount_to_be_paid), 0) AS total_sales,
          COALESCE(SUM(CASE WHEN date = ? OR date LIKE ? THEN amount_to_be_paid ELSE 0 END), 0) AS today_sales,
          COALESCE(SUM(CASE WHEN date = ? OR date LIKE ? THEN credit_kept_today ELSE 0 END), 0) AS today_credit_given,
          COALESCE(SUM(CASE WHEN date LIKE ? THEN amount_to_be_paid ELSE 0 END), 0) AS last_month_sales,
          COALESCE(SUM(CASE WHEN date LIKE ? THEN credit_kept_today ELSE 0 END), 0) AS last_month_credit_given,
          COALESCE(SUM(ROUND(trays * 30)), 0) AS total_eggs_sold,
          COUNT(*) AS total_transactions
         FROM transactions
         WHERE type != 'payment'`,
        [
          todayStr,
          todayLike,
          todayStr,
          todayLike,
          lastMonthLike,
          lastMonthLike,
        ],
      )

      const totalSalesAmount = Number(txRes[0]?.total_sales) || 0
      const todaySales = Number(txRes[0]?.today_sales) || 0
      const todayCreditGiven = Number(txRes[0]?.today_credit_given) || 0
      const lastMonthSales = Number(txRes[0]?.last_month_sales) || 0
      const lastMonthOutstandingCredit =
        Number(txRes[0]?.last_month_credit_given) || 0
      const totalEggsSold = Number(txRes[0]?.total_eggs_sold) || 0
      const totalTransactions = Number(txRes[0]?.total_transactions) || 0

      // 2. Purchases
      const purchaseRes = await dbInstance.query(
        `SELECT 
          COALESCE(SUM(total_amount), 0) AS total_purchase_cost,
          COALESCE(SUM(CASE WHEN date = ? OR date LIKE ? THEN total_amount ELSE 0 END), 0) AS today_purchase_cost,
          COALESCE(SUM(CASE WHEN date LIKE ? THEN total_amount ELSE 0 END), 0) AS last_month_purchases,
          COALESCE(SUM(trays), 0) AS total_trays_purchased,
          COALESCE(SUM(CASE WHEN total_eggs > 0 THEN total_eggs ELSE ROUND(trays * 30) END), 0) AS total_eggs_purchased
         FROM purchases`,
        [todayStr, todayLike, lastMonthLike],
      )

      const totalPurchaseCost = Number(purchaseRes[0]?.total_purchase_cost) || 0
      const todayPurchaseCost = Number(purchaseRes[0]?.today_purchase_cost) || 0
      const lastMonthPurchases =
        Number(purchaseRes[0]?.last_month_purchases) || 0
      const totalTraysPurchased =
        Number(purchaseRes[0]?.total_trays_purchased) || 0
      const totalEggsPurchased =
        Number(purchaseRes[0]?.total_eggs_purchased) || 0

      // 3. Expenses
      const expenseRes = await dbInstance.query(
        `SELECT 
          COALESCE(SUM(amount), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN date = ? OR date LIKE ? THEN amount ELSE 0 END), 0) AS today_expenses,
          COALESCE(SUM(CASE WHEN date LIKE ? THEN amount ELSE 0 END), 0) AS last_month_expenses
         FROM expenses`,
        [todayStr, todayLike, lastMonthLike],
      )

      const totalExpenses = Number(expenseRes[0]?.total_expenses) || 0
      const todayExpenses = Number(expenseRes[0]?.today_expenses) || 0
      const lastMonthExpenses = Number(expenseRes[0]?.last_month_expenses) || 0

      // 4. Customers & Outstanding Credit
      const custRes = await dbInstance.query(
        `SELECT 
          COALESCE(SUM(outstanding_credit), 0) AS total_outstanding,
          COUNT(CASE WHEN outstanding_credit > 0 THEN 1 END) AS pending_credit_customers_count
         FROM customers`,
      )

      const totalOutstandingCredit = Number(custRes[0]?.total_outstanding) || 0
      const pendingCreditCustomersCount =
        Number(custRes[0]?.pending_credit_customers_count) || 0

      // 5. Inventory Metrics
      const inventory = await getSQLiteInventoryMetrics()

      // 6. Gross Profit Calculations
      const todayGrossProfit = todaySales - todayExpenses - todayPurchaseCost
      const lastMonthGrossProfit =
        lastMonthSales - lastMonthExpenses - lastMonthPurchases

      return {
        totalSalesAmount,
        todaySales,
        todayCreditGiven,
        totalEggsSold,
        totalTransactions,
        totalPurchaseCost,
        todayPurchaseCost,
        totalTraysPurchased,
        totalEggsPurchased,
        totalExpenses,
        todayExpenses,
        totalOutstandingCredit,
        pendingCreditCustomersCount,
        lastMonthOutstandingCredit,
        todayGrossProfit,
        lastMonthGrossProfit,
        inventory,
      }
    } catch (err) {
      console.error("Error calculating dashboard metrics from SQLite:", err)
      return {
        totalSalesAmount: 0,
        todaySales: 0,
        todayCreditGiven: 0,
        totalEggsSold: 0,
        totalTransactions: 0,
        totalPurchaseCost: 0,
        todayPurchaseCost: 0,
        totalTraysPurchased: 0,
        totalEggsPurchased: 0,
        totalExpenses: 0,
        todayExpenses: 0,
        totalOutstandingCredit: 0,
        pendingCreditCustomersCount: 0,
        lastMonthOutstandingCredit: 0,
        todayGrossProfit: 0,
        lastMonthGrossProfit: 0,
        inventory: {
          remainingEggs: 0,
          remainingTrays: 0,
          todayPurchaseCost: 0,
          todayPurchasesCount: 0,
        },
      }
    }
  }
}

export const dashboardService = new DashboardService()
