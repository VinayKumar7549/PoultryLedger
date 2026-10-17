import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  setupSyntheticTestDb,
  teardownSyntheticTestDb,
  SyntheticSqliteHarness,
} from "./helpers/syntheticDb"
import { customerRepository } from "../src/database/repositories/CustomerRepository"
import { routeRepository } from "../src/database/repositories/RouteRepository"
import { transactionRepository } from "../src/database/repositories/TransactionRepository"
import { purchaseRepository } from "../src/database/repositories/PurchaseRepository"
import { creditService } from "../src/services/creditService"
import { pdfReportDataService } from "../src/services/pdfReportDataService"
import { dashboardService } from "../src/services/dashboardService"

test("Phase D — Dates, Reports, and Credit History Verification", async (t) => {
  let harness: SyntheticSqliteHarness

  beforeEach(async () => {
    harness = setupSyntheticTestDb()
    await routeRepository.create({ id: "r1", name: "Route 1" })
    await customerRepository.create({
      id: "c1",
      name: "Customer 1",
      route_id: "r1",
      opening_credit: 500,
      outstanding_credit: 500,
    })
  })

  afterEach(() => {
    teardownSyntheticTestDb()
  })

  await t.test(
    "BUG-05: Online payment method is included in sales and summary PDF totals",
    async () => {
      // Record cash sale: bill 1000, paid 400 cash
      await transactionRepository.create({
        id: "tx-cash",
        customer_id: "c1",
        type: "sale",
        date: "2026-10-17",
        time: "09:00:00",
        trays: 5,
        amount_to_be_paid: 1000,
        amount_paid: 400,
        payment_method: "cash",
        credit_kept_today: 600,
        credit_change: -600,
      })

      // Record online payment: paid 500 online
      await transactionRepository.create({
        id: "tx-online",
        customer_id: "c1",
        type: "payment",
        date: "2026-10-17",
        time: "10:00:00",
        trays: 0,
        amount_to_be_paid: 0,
        amount_paid: 500,
        payment_method: "online",
        credit_kept_today: 0,
        credit_change: 500,
      })

      const salesReport = await pdfReportDataService.getSalesReport({
        filter: "custom",
        startDate: "2026-10-17",
        endDate: "2026-10-17",
      })

      assert.strictEqual(
        salesReport.cashReceived,
        400,
        "Cash received should be 400",
      )
      assert.strictEqual(
        salesReport.gpayReceived,
        500,
        "Online/UPI received should include 500",
      )
      assert.strictEqual(
        salesReport.totalPaid,
        900,
        "Total paid should be 400 + 500 = 900",
      )

      const summaryReport = await pdfReportDataService.getDailySummaryReport({
        filter: "custom",
        startDate: "2026-10-17",
        endDate: "2026-10-17",
      })

      assert.strictEqual(
        summaryReport.totalPayments,
        900,
        "Daily summary totalPayments must include online payments",
      )
      assert.strictEqual(
        summaryReport.gpayReceived,
        500,
        "Daily summary gpayReceived must include online payments",
      )
    },
  )

  await t.test(
    "BUG-10: PDF reports and Inventory screen communicate identical stock quantities",
    async () => {
      // Purchase 10 trays (300 eggs)
      await purchaseRepository.create({
        id: "p-sync-1",
        date: "2026-10-17",
        time: "08:00:00",
        trays: 10,
        total_eggs: 300,
        egg_type: "normal",
        rate_per_100: 500,
        total_amount: 1500,
      })

      // Sell 40 eggs (1.33 trays, leaving 260 eggs = 8.67 trays)
      await transactionRepository.create({
        id: "tx-sync-sale",
        customer_id: "c1",
        type: "sale",
        date: "2026-10-17",
        time: "11:00:00",
        trays: 40 / 30,
        amount_to_be_paid: 200,
        amount_paid: 200,
        payment_method: "cash",
        credit_kept_today: 0,
        credit_change: 0,
      })

      const summary = await pdfReportDataService.getDailySummaryReport({
        filter: "custom",
        startDate: "2026-10-17",
        endDate: "2026-10-17",
      })

      assert.strictEqual(
        summary.remainingInventoryEggs,
        260,
        "Remaining eggs must be 260",
      )
      assert.strictEqual(
        summary.remainingInventoryTrays,
        8.67,
        "Remaining trays must be 8.67, not rounded down to 8",
      )
    },
  )

  await t.test(
    "BUG-11: Dashboard sales metrics count sales, excluding payment-only records",
    async () => {
      // 1 sale and 1 payment
      await transactionRepository.create({
        id: "d-sale",
        customer_id: "c1",
        type: "sale",
        date: "2026-10-17",
        time: "09:00:00",
        trays: 10,
        amount_to_be_paid: 1800,
        amount_paid: 1000,
        payment_method: "cash",
        credit_kept_today: 800,
        credit_change: -800,
      })

      await transactionRepository.create({
        id: "d-pay",
        customer_id: "c1",
        type: "payment",
        date: "2026-10-17",
        time: "10:00:00",
        trays: 0,
        amount_to_be_paid: 0,
        amount_paid: 500,
        payment_method: "online",
        credit_kept_today: 0,
        credit_change: 500,
      })

      const metrics = await dashboardService.getDashboardMetrics()
      assert.strictEqual(
        metrics.totalSalesAmount,
        1800,
        "Total sales should be 1800",
      )
      assert.strictEqual(metrics.todaySales, 1800, "Today sales should be 1800")
      assert.strictEqual(
        metrics.totalEggsSold,
        300,
        "Total eggs sold should be 300 (10 trays)",
      )
      assert.strictEqual(
        metrics.totalTransactions,
        1,
        "Sales transaction count should be 1, excluding payment-only",
      )
    },
  )

  await t.test(
    "BUG-14: Reverse credit reconstruction does not clamp negative advance balances to zero",
    async () => {
      // Customer has opening balance 100, then pays 300 advance (balance -200), then buys 150 (balance -50)
      await customerRepository.create({
        id: "c-adv",
        name: "Advance Customer",
        route_id: "r1",
        opening_credit: 100,
        outstanding_credit: -50,
        created_at: "2026-10-01T00:00:00Z",
      })

      // Payment of 300 on Oct 2
      await transactionRepository.create({
        id: "tx-adv-pay",
        customer_id: "c-adv",
        type: "payment",
        date: "2026-10-02",
        time: "10:00:00",
        trays: 0,
        amount_to_be_paid: 0,
        amount_paid: 300,
        payment_method: "cash",
        credit_kept_today: 0,
        credit_change: 300,
      })

      // Sale of 150 on Oct 5
      await transactionRepository.create({
        id: "tx-adv-sale",
        customer_id: "c-adv",
        type: "sale",
        date: "2026-10-05",
        time: "10:00:00",
        trays: 5,
        amount_to_be_paid: 150,
        amount_paid: 0,
        payment_method: "cash",
        credit_kept_today: 150,
        credit_change: -150,
      })

      const history = await creditService.getCustomerCreditHistory("c-adv", -50)
      assert.ok(history.length >= 2)
      // The history must preserve the negative advance without corrupting to 0
      const payEntry = history.find((h) => h.tx.id === "tx-adv-pay")
      assert.ok(payEntry)
      assert.strictEqual(
        payEntry.updatedOutstanding,
        -200,
        "Advance balance of -200 must be preserved",
      )
    },
  )
})
