import { dbInstance } from '../database/database'
import { customerRepository } from '../database/repositories/CustomerRepository'
import { transactionRepository } from '../database/repositories/TransactionRepository'
import { expenseRepository } from '../database/repositories/ExpenseRepository'
import { purchaseRepository } from '../database/repositories/PurchaseRepository'
import { routeRepository } from '../database/repositories/RouteRepository'
import { getTodayStr, fmtDate, shiftDateStr, toIso, compareTimestampsAsc } from '../utils/date'

export type DateFilterOption =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
  label: string
}

export function getLastMonthRange(refDateStr: string = getTodayStr()): { startDate: string; endDate: string } {
  const [y, m] = refDateStr.split('-').map(Number)
  const firstOfCurrentMonth = new Date(y, m - 1, 1)
  const lastDayOfPrevMonth = new Date(firstOfCurrentMonth.getTime() - 86400000)
  const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1)
  return {
    startDate: toIso(firstDayOfPrevMonth),
    endDate: toIso(lastDayOfPrevMonth),
  }
}

export function resolveDateRange(
  filter: DateFilterOption,
  customStart?: string,
  customEnd?: string,
  refDateStr: string = getTodayStr()
): DateRange {
  const [yearStr, monthStr] = refDateStr.split('-')

  switch (filter) {
    case 'today':
      return {
        startDate: refDateStr,
        endDate: refDateStr,
        label: `Today (${fmtDate(refDateStr)})`,
      }

    case 'yesterday': {
      const yDate = shiftDateStr(refDateStr, -1)
      return {
        startDate: yDate,
        endDate: yDate,
        label: `Yesterday (${fmtDate(yDate)})`,
      }
    }

    case 'last_7_days': {
      const sDate = shiftDateStr(refDateStr, -6)
      return {
        startDate: sDate,
        endDate: refDateStr,
        label: `Last 7 Days (${fmtDate(sDate)} - ${fmtDate(refDateStr)})`,
      }
    }

    case 'this_month': {
      const sDate = `${yearStr}-${monthStr}-01`
      return {
        startDate: sDate,
        endDate: refDateStr,
        label: `This Month (${fmtDate(sDate)} - ${fmtDate(refDateStr)})`,
      }
    }

    case 'last_month': {
      const { startDate, endDate } = getLastMonthRange(refDateStr)
      return {
        startDate,
        endDate,
        label: `Last Month (${fmtDate(startDate)} - ${fmtDate(endDate)})`,
      }
    }

    case 'this_year': {
      const sDate = `${yearStr}-01-01`
      return {
        startDate: sDate,
        endDate: refDateStr,
        label: `This Year ${yearStr} (${fmtDate(sDate)} - ${fmtDate(refDateStr)})`,
      }
    }

    case 'custom': {
      const sDate = customStart || refDateStr
      const eDate = customEnd || refDateStr
      return {
        startDate: sDate,
        endDate: eDate,
        label: `Custom Range (${fmtDate(sDate)} - ${fmtDate(eDate)})`,
      }
    }

    default:
      return {
        startDate: refDateStr,
        endDate: refDateStr,
        label: fmtDate(refDateStr),
      }
  }
}

// ── Customer Statement Interface ──
export interface CustomerStatementLedgerItem {
  date: string
  time: string
  type: 'sale' | 'payment'
  description: string
  trays: number
  totalEggs: number
  ratePer100: number
  debit: number
  credit: number
  paymentMethod: string
  notes: string
  runningBalance: number
}

export interface CustomerStatementReport {
  customer: { id: string; name: string; subtitle: string }
  routeName: string
  dateRange: DateRange
  openingBalance: number
  closingBalance: number
  totalBilled: number
  totalPaid: number
  totalTrays: number
  totalEggs: number
  ledger: CustomerStatementLedgerItem[]
}

// ── Credit Report Interface ──
export interface CreditReportItem {
  customerId: string
  customerName: string
  subtitle: string
  routeName: string
  lastTransactionDate: string
  totalSales: number
  totalPaid: number
  outstandingCredit: number
}

export interface CreditReport {
  dateRange: DateRange
  routeFilterName: string
  totalCustomersWithCredit: number
  totalOutstandingCredit: number
  items: CreditReportItem[]
}

// ── Expense Report Interface ──
export interface ExpenseCategoryBreakdown {
  category: string
  count: number
  amount: number
  percentage: number
}

export interface ExpenseReportItem {
  id: string
  date: string
  time: string
  purpose: string
  paymentMethod: string
  amount: number
}

export interface ExpenseReport {
  dateRange: DateRange
  totalExpenses: number
  totalCount: number
  categoryBreakdown: ExpenseCategoryBreakdown[]
  expenses: ExpenseReportItem[]
}

// ── Sales Report Interface ──
export interface CustomerSalesSummary {
  customerId: string
  customerName: string
  routeName: string
  traysSold: number
  amountBilled: number
  amountPaid: number
  creditAdded: number
}

export interface SalesReportTransactionItem {
  date: string
  time: string
  customerName: string
  routeName: string
  trays: number
  totalEggs: number
  ratePer100: number
  amountBilled: number
  amountPaid: number
  paymentMethod: string
  creditKept: number
}

export interface SalesReport {
  dateRange: DateRange
  routeFilterName: string
  totalSales: number
  totalTraysSold: number
  totalEggsSold: number
  totalPaid: number
  cashReceived: number
  gpayReceived: number
  creditAdded: number
  customerSummaries: CustomerSalesSummary[]
  transactions: SalesReportTransactionItem[]
}

// ── Inventory Report Interface ──
export interface InventoryPurchaseItem {
  date: string
  time: string
  eggType: string
  trays: number
  totalEggs: number
  ratePer100: number
  totalAmount: number
}

export interface InventoryDailyMovement {
  date: string
  traysPurchased: number
  traysSold: number
  netTrays: number
}

export interface InventoryReport {
  dateRange: DateRange
  totalPurchasesCount: number
  totalPurchasesTrays: number
  totalPurchasesEggs: number
  totalPurchasesCost: number
  avgPurchaseRatePer100: number
  totalSalesTrays: number
  totalSalesEggs: number
  totalSalesRevenue: number
  netStockChangeTrays: number
  netStockChangeEggs: number
  purchases: InventoryPurchaseItem[]
  dailyMovements: InventoryDailyMovement[]
}

// ── Daily Summary Interface ──
export interface DailySummaryReport {
  dateRange: DateRange
  selectedDate: string
  totalSales: number
  totalPayments: number
  cashReceived: number
  gpayReceived: number
  creditAdded: number
  totalTraysSold: number
  totalEggsSold: number
  customersServedCount: number
  totalPurchases: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  remainingInventoryTrays: number
  remainingInventoryEggs: number
  transactionsCount: number
  purchasesCount: number
  expensesCount: number
  transactions: SalesReportTransactionItem[]
  expenses: ExpenseReportItem[]
  purchases: InventoryPurchaseItem[]
}

// ── Monthly Summary Interface ──
export interface MonthlyDailyBreakdown {
  date: string
  sales: number
  traysSold: number
  eggsSold: number
  payments: number
  creditAdded: number
  purchases: number
  expenses: number
  grossProfit: number
  netProfit: number
}

export interface MonthlySummaryReport {
  dateRange: DateRange
  selectedMonth: string
  totalSales: number
  totalPayments: number
  outstandingCredit: number
  totalTraysSold: number
  totalEggsSold: number
  totalPurchases: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  activeCustomers: number
  dailyBreakdowns: MonthlyDailyBreakdown[]
}

class PdfReportDataService {
  private async getRouteMap(): Promise<Record<string, string>> {
    const routes = await routeRepository.getAll()
    const map: Record<string, string> = {}
    routes.forEach(r => {
      map[r.id] = r.name
    })
    return map
  }

  // 1. CUSTOMER STATEMENT
  async getCustomerStatement(
    customerId: string,
    dateRange: DateRange
  ): Promise<CustomerStatementReport | null> {
    await dbInstance.initDatabase()
    const customer = await customerRepository.getById(customerId)
    if (!customer) return null

    const routeMap = await this.getRouteMap()
    const routeName = routeMap[customer.route_id] || 'General Route'

    const allTxs = await transactionRepository.getByCustomerId(customerId)
    allTxs.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))

    const openingCreditBase = Number(customer.opening_credit) || 0
    let runningBalance = openingCreditBase

    const priorTxs = allTxs.filter(t => t.date < dateRange.startDate)
    priorTxs.forEach(t => {
      const billed = Number(t.amount_to_be_paid) || 0
      const paid = Number(t.amount_paid) || 0
      runningBalance += billed - paid
    })

    const openingBalance = runningBalance
    const periodTxs = allTxs.filter(
      t => t.date >= dateRange.startDate && t.date <= dateRange.endDate
    )

    let totalBilled = 0
    let totalPaid = 0
    let totalTrays = 0
    let totalEggs = 0

    const ledger: CustomerStatementLedgerItem[] = periodTxs.map(t => {
      const billed = Number(t.amount_to_be_paid) || 0
      const paid = Number(t.amount_paid) || 0
      const trays = Number(t.trays) || 0
      const eggs = Math.round(trays * 30)
      const isSale = t.type === 'sale' || trays > 0 || billed > 0

      runningBalance += billed - paid

      totalBilled += billed
      totalPaid += paid
      totalTrays += trays
      totalEggs += eggs

      const ratePer100 = eggs > 0 ? (billed / eggs) * 100 : 0
      const description = isSale
        ? `Sale (${trays} Trays / ${eggs} Eggs)`
        : `Payment Received (${(t.payment_method || 'cash').toUpperCase()})`

      return {
        date: t.date,
        time: t.time || '',
        type: isSale ? 'sale' : 'payment',
        description,
        trays,
        totalEggs: eggs,
        ratePer100,
        debit: billed,
        credit: paid,
        paymentMethod: t.payment_method || 'cash',
        notes: t.notes || '',
        runningBalance,
      }
    })

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        subtitle: customer.subtitle || '',
      },
      routeName,
      dateRange,
      openingBalance,
      closingBalance: runningBalance,
      totalBilled,
      totalPaid,
      totalTrays,
      totalEggs,
      ledger,
    }
  }

  // 2. CREDIT REPORT
  async getCreditReport(dateRange: DateRange, filterRouteId?: string): Promise<CreditReport> {
    await dbInstance.initDatabase()
    const customers = await customerRepository.getAll()
    const allTxs = await transactionRepository.getAll()
    const routeMap = await this.getRouteMap()

    let filterRouteName = 'All Routes'
    if (filterRouteId) {
      filterRouteName = routeMap[filterRouteId] || filterRouteId
    }

    const txMap: Record<string, typeof allTxs> = {}
    allTxs.forEach(t => {
      if (!txMap[t.customer_id]) txMap[t.customer_id] = []
      txMap[t.customer_id].push(t)
    })

    const items: CreditReportItem[] = []
    let totalOutstandingCredit = 0

    customers.forEach(c => {
      if (filterRouteId && String(c.route_id) !== String(filterRouteId)) return

      const custTxs = txMap[c.id] || []
      custTxs.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))

      const outstanding = Number(c.outstanding_credit) || 0
      if (outstanding <= 0) return

      totalOutstandingCredit += outstanding

      let periodSales = 0
      let periodPaid = 0
      let lastDate = c.created_at ? c.created_at.split('T')[0] : getTodayStr()

      custTxs.forEach(t => {
        if (t.date >= dateRange.startDate && t.date <= dateRange.endDate) {
          periodSales += Number(t.amount_to_be_paid) || 0
          periodPaid += Number(t.amount_paid) || 0
        }
        if (t.date > lastDate) lastDate = t.date
      })

      items.push({
        customerId: c.id,
        customerName: c.name,
        subtitle: c.subtitle || '',
        routeName: routeMap[c.route_id] || 'General Route',
        lastTransactionDate: lastDate,
        totalSales: periodSales,
        totalPaid: periodPaid,
        outstandingCredit: outstanding,
      })
    })

    items.sort((a, b) => b.outstandingCredit - a.outstandingCredit)

    return {
      dateRange,
      routeFilterName: filterRouteName,
      totalCustomersWithCredit: items.length,
      totalOutstandingCredit,
      items,
    }
  }

  // 3. EXPENSE REPORT
  async getExpenseReport(dateRange: DateRange): Promise<ExpenseReport> {
    await dbInstance.initDatabase()
    const allExpenses = await expenseRepository.getAll()

    const filtered = allExpenses.filter(e => {
      const d = (e.date || '').trim().split('T')[0]
      return d >= dateRange.startDate && d <= dateRange.endDate
    })

    filtered.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))

    let totalExpenses = 0
    const catMap: Record<string, { count: number; amount: number }> = {}

    filtered.forEach(e => {
      const amt = Number(e.amount) || 0
      totalExpenses += amt

      const cat = (e.purpose || 'General').trim()
      if (!catMap[cat]) catMap[cat] = { count: 0, amount: 0 }
      catMap[cat].count += 1
      catMap[cat].amount += amt
    })

    const categoryBreakdown: ExpenseCategoryBreakdown[] = Object.keys(catMap)
      .map(cat => ({
        category: cat,
        count: catMap[cat].count,
        amount: catMap[cat].amount,
        percentage: totalExpenses > 0 ? (catMap[cat].amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    const expenses: ExpenseReportItem[] = filtered.map(e => ({
      id: e.id,
      date: e.date,
      time: e.time || '',
      purpose: e.purpose,
      paymentMethod: e.payment_method || 'cash',
      amount: Number(e.amount) || 0,
    }))

    return {
      dateRange,
      totalExpenses,
      totalCount: filtered.length,
      categoryBreakdown,
      expenses,
    }
  }

  // 4. SALES REPORT
  async getSalesReport(dateRange: DateRange, filterRouteId?: string): Promise<SalesReport> {
    await dbInstance.initDatabase()
    const allTxs = await transactionRepository.getAll()
    const customers = await customerRepository.getAll()
    const routeMap = await this.getRouteMap()

    const custMap: Record<string, { name: string; routeId: string }> = {}
    customers.forEach(c => {
      custMap[String(c.id)] = { name: c.name, routeId: String(c.route_id || '') }
    })

    let filterRouteName = 'All Routes'
    if (filterRouteId) {
      filterRouteName = routeMap[filterRouteId] || filterRouteId
    }

    const filteredTxs = allTxs.filter(t => {
      const txDate = (t.date || '').trim().split('T')[0]
      if (txDate < dateRange.startDate || txDate > dateRange.endDate) return false
      if (filterRouteId) {
        const c = custMap[String(t.customer_id)]
        if (!c || c.routeId !== String(filterRouteId)) return false
      }
      return true
    })

    filteredTxs.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))

    let totalSales = 0
    let totalTraysSold = 0
    let totalPaid = 0
    let cashReceived = 0
    let gpayReceived = 0
    let creditAdded = 0

    const custSummaryMap: Record<string, CustomerSalesSummary> = {}

    const transactions: SalesReportTransactionItem[] = filteredTxs.map(t => {
      const cust = custMap[String(t.customer_id)]
      const custName = cust ? cust.name : 'Unknown Customer'
      const rName = cust ? routeMap[cust.routeId] || 'General' : 'General'

      const trays = Number(t.trays) || 0
      const totalEggs = Math.round(trays * 30)
      const billed = Number(t.amount_to_be_paid) || 0
      const paid = Number(t.amount_paid) || 0
      const credit = Number(t.credit_kept_today) || 0
      const method = t.payment_method || 'cash'
      const ratePer100 = totalEggs > 0 ? (billed / totalEggs) * 100 : 0

      totalSales += billed
      totalTraysSold += trays
      totalPaid += paid
      if (method === 'cash') cashReceived += paid
      else if (method === 'gpay') gpayReceived += paid
      creditAdded += credit

      // Aggregate by customer
      const cIdStr = String(t.customer_id)
      if (!custSummaryMap[cIdStr]) {
        custSummaryMap[cIdStr] = {
          customerId: cIdStr,
          customerName: custName,
          routeName: rName,
          traysSold: 0,
          amountBilled: 0,
          amountPaid: 0,
          creditAdded: 0,
        }
      }
      custSummaryMap[cIdStr].traysSold += trays
      custSummaryMap[cIdStr].amountBilled += billed
      custSummaryMap[cIdStr].amountPaid += paid
      custSummaryMap[cIdStr].creditAdded += credit

      return {
        date: t.date,
        time: t.time || '',
        customerName: custName,
        routeName: rName,
        trays,
        totalEggs,
        ratePer100,
        amountBilled: billed,
        amountPaid: paid,
        paymentMethod: method,
        creditKept: credit,
      }
    })

    const customerSummaries = Object.values(custSummaryMap).sort(
      (a, b) => b.amountBilled - a.amountBilled
    )

    return {
      dateRange,
      routeFilterName: filterRouteName,
      totalSales,
      totalTraysSold,
      totalEggsSold: Math.round(totalTraysSold * 30),
      totalPaid,
      cashReceived,
      gpayReceived,
      creditAdded,
      customerSummaries,
      transactions,
    }
  }

  // 5. INVENTORY REPORT
  async getInventoryReport(dateRange: DateRange): Promise<InventoryReport> {
    await dbInstance.initDatabase()
    const purchases = await purchaseRepository.getAll()
    const transactions = await transactionRepository.getAll()

    const filteredPurchases = purchases.filter(p => {
      const d = (p.date || '').trim().split('T')[0]
      return d >= dateRange.startDate && d <= dateRange.endDate
    })
    filteredPurchases.sort((a, b) => compareTimestampsAsc(a.date, a.time, b.date, b.time, a.created_at, b.created_at))

    const filteredTxs = transactions.filter(t => {
      const d = (t.date || '').trim().split('T')[0]
      return d >= dateRange.startDate && d <= dateRange.endDate
    })

    const totalPurchasesTrays = filteredPurchases.reduce((sum, p) => sum + (Number(p.trays) || 0), 0)
    const totalPurchasesEggs = filteredPurchases.reduce(
      (sum, p) => sum + (Number(p.total_eggs) || Math.round((Number(p.trays) || 0) * 30)),
      0
    )
    const totalPurchasesCost = filteredPurchases.reduce(
      (sum, p) => sum + (Number(p.total_amount) || 0),
      0
    )

    const avgPurchaseRatePer100 =
      totalPurchasesEggs > 0 ? (totalPurchasesCost / totalPurchasesEggs) * 100 : 0

    const totalSalesTrays = filteredTxs.reduce((sum, t) => sum + (Number(t.trays) || 0), 0)
    const totalSalesEggs = Math.round(totalSalesTrays * 30)
    const totalSalesRevenue = filteredTxs.reduce(
      (sum, t) => sum + (Number(t.amount_to_be_paid) || 0),
      0
    )

    const netStockChangeTrays = totalPurchasesTrays - totalSalesTrays
    const netStockChangeEggs = totalPurchasesEggs - totalSalesEggs

    // Daily inventory movement aggregation
    const movementMap: Record<string, { purchased: number; sold: number }> = {}

    filteredPurchases.forEach(p => {
      if (!movementMap[p.date]) movementMap[p.date] = { purchased: 0, sold: 0 }
      movementMap[p.date].purchased += Number(p.trays) || 0
    })
    filteredTxs.forEach(t => {
      if (!movementMap[t.date]) movementMap[t.date] = { purchased: 0, sold: 0 }
      movementMap[t.date].sold += Number(t.trays) || 0
    })

    const dailyMovements: InventoryDailyMovement[] = Object.keys(movementMap)
      .sort()
      .map(d => ({
        date: d,
        traysPurchased: movementMap[d].purchased,
        traysSold: movementMap[d].sold,
        netTrays: movementMap[d].purchased - movementMap[d].sold,
      }))

    const purchaseItems: InventoryPurchaseItem[] = filteredPurchases.map(p => ({
      date: p.date,
      time: p.time || '',
      eggType: p.egg_type === 'damaged' ? 'Damaged / Waste' : 'Normal Stock',
      trays: Number(p.trays) || 0,
      totalEggs: Number(p.total_eggs) || Math.round((Number(p.trays) || 0) * 30),
      ratePer100: Number(p.rate_per_100) || 0,
      totalAmount: Number(p.total_amount) || 0,
    }))

    return {
      dateRange,
      totalPurchasesCount: filteredPurchases.length,
      totalPurchasesTrays,
      totalPurchasesEggs,
      totalPurchasesCost,
      avgPurchaseRatePer100,
      totalSalesTrays,
      totalSalesEggs,
      totalSalesRevenue,
      netStockChangeTrays,
      netStockChangeEggs,
      purchases: purchaseItems,
      dailyMovements,
    }
  }

  // 6. DAILY SUMMARY
  async getDailySummaryReport(dateRange: DateRange): Promise<DailySummaryReport> {
    await dbInstance.initDatabase()
    const salesReport = await this.getSalesReport(dateRange)
    const expenseReport = await this.getExpenseReport(dateRange)
    const inventoryReport = await this.getInventoryReport(dateRange)

    const allPurchases = await purchaseRepository.getAll()
    const allTxs = await transactionRepository.getAll()

    // Remaining inventory calculation across all historical records
    const allPurchasedEggs = allPurchases.reduce(
      (sum, p) => sum + (Number(p.total_eggs) || Math.round((Number(p.trays) || 0) * 30)),
      0
    )
    const allSoldEggs = allTxs.reduce(
      (sum, t) => sum + Math.round((Number(t.trays) || 0) * 30),
      0
    )
    const remainingInventoryEggs = Math.max(0, allPurchasedEggs - allSoldEggs)
    const remainingInventoryTrays = Math.floor(remainingInventoryEggs / 30)

    const customersServedCount = new Set(salesReport.transactions.map(t => t.customerName)).size
    const totalPayments = salesReport.cashReceived + salesReport.gpayReceived
    const grossProfit = salesReport.totalSales - inventoryReport.totalPurchasesCost
    const netProfit = grossProfit - expenseReport.totalExpenses

    return {
      dateRange,
      selectedDate: dateRange.startDate,
      totalSales: salesReport.totalSales,
      totalPayments,
      cashReceived: salesReport.cashReceived,
      gpayReceived: salesReport.gpayReceived,
      creditAdded: salesReport.creditAdded,
      totalTraysSold: salesReport.totalTraysSold,
      totalEggsSold: salesReport.totalEggsSold,
      customersServedCount,
      totalPurchases: inventoryReport.totalPurchasesCost,
      totalExpenses: expenseReport.totalExpenses,
      grossProfit,
      netProfit,
      remainingInventoryTrays,
      remainingInventoryEggs,
      transactionsCount: salesReport.transactions.length,
      purchasesCount: inventoryReport.purchases.length,
      expensesCount: expenseReport.expenses.length,
      transactions: salesReport.transactions,
      expenses: expenseReport.expenses,
      purchases: inventoryReport.purchases,
    }
  }

  // 7. MONTHLY SUMMARY
  async getMonthlySummaryReport(dateRange: DateRange): Promise<MonthlySummaryReport> {
    await dbInstance.initDatabase()

    const salesReport = await this.getSalesReport(dateRange)
    const expenseReport = await this.getExpenseReport(dateRange)
    const inventoryReport = await this.getInventoryReport(dateRange)

    const dailyMap: Record<
      string,
      {
        sales: number
        trays: number
        eggs: number
        payments: number
        credit: number
        purchases: number
        expenses: number
      }
    > = {}

    salesReport.transactions.forEach(t => {
      if (!dailyMap[t.date]) {
        dailyMap[t.date] = {
          sales: 0,
          trays: 0,
          eggs: 0,
          payments: 0,
          credit: 0,
          purchases: 0,
          expenses: 0,
        }
      }
      dailyMap[t.date].sales += t.amountBilled
      dailyMap[t.date].trays += t.trays
      dailyMap[t.date].eggs += t.totalEggs
      dailyMap[t.date].payments += t.amountPaid
      dailyMap[t.date].credit += t.creditKept
    })

    inventoryReport.purchases.forEach(p => {
      if (!dailyMap[p.date]) {
        dailyMap[p.date] = {
          sales: 0,
          trays: 0,
          eggs: 0,
          payments: 0,
          credit: 0,
          purchases: 0,
          expenses: 0,
        }
      }
      dailyMap[p.date].purchases += p.totalAmount
    })

    expenseReport.expenses.forEach(e => {
      if (!dailyMap[e.date]) {
        dailyMap[e.date] = {
          sales: 0,
          trays: 0,
          eggs: 0,
          payments: 0,
          credit: 0,
          purchases: 0,
          expenses: 0,
        }
      }
      dailyMap[e.date].expenses += e.amount
    })

    const dailyBreakdowns: MonthlyDailyBreakdown[] = Object.keys(dailyMap)
      .sort()
      .map(date => {
        const item = dailyMap[date]
        const grossProfit = item.sales - item.purchases
        const netProfit = grossProfit - item.expenses
        return {
          date,
          sales: item.sales,
          traysSold: item.trays,
          eggsSold: item.eggs,
          payments: item.payments,
          creditAdded: item.credit,
          purchases: item.purchases,
          expenses: item.expenses,
          grossProfit,
          netProfit,
        }
      })

    const activeCustSet = new Set(salesReport.transactions.map(t => t.customerName))
    const grossProfit = salesReport.totalSales - inventoryReport.totalPurchasesCost
    const netProfit = grossProfit - expenseReport.totalExpenses

    return {
      dateRange,
      selectedMonth: dateRange.startDate.slice(0, 7),
      totalSales: salesReport.totalSales,
      totalPayments: salesReport.totalPaid,
      outstandingCredit: salesReport.creditAdded,
      totalTraysSold: salesReport.totalTraysSold,
      totalEggsSold: salesReport.totalEggsSold,
      totalPurchases: inventoryReport.totalPurchasesCost,
      totalExpenses: expenseReport.totalExpenses,
      grossProfit,
      netProfit,
      activeCustomers: activeCustSet.size,
      dailyBreakdowns,
    }
  }
}

export const pdfReportDataService = new PdfReportDataService()
