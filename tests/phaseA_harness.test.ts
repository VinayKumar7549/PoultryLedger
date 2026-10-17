import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  setupSyntheticTestDb,
  teardownSyntheticTestDb,
  SyntheticSqliteHarness,
} from "./helpers/syntheticDb"
import { dbInstance } from "../src/database/database"
import { customerRepository } from "../src/database/repositories/CustomerRepository"
import { routeRepository } from "../src/database/repositories/RouteRepository"
import { transactionRepository } from "../src/database/repositories/TransactionRepository"
import { purchaseRepository } from "../src/database/repositories/PurchaseRepository"
import { expenseRepository } from "../src/database/repositories/ExpenseRepository"

test("Phase A — Isolated Synthetic Test Harness Verification", async (t) => {
  let harness: SyntheticSqliteHarness

  beforeEach(() => {
    harness = setupSyntheticTestDb()
  })

  afterEach(() => {
    teardownSyntheticTestDb()
  })

  await t.test("1. Database adapter is active and isolated in memory", () => {
    assert.ok(
      dbInstance.getCustomAdapter(),
      "dbInstance must be using custom test adapter",
    )
    assert.strictEqual(
      dbInstance.getDBConnection(),
      null,
      "Production SQLite connection must be null",
    )
  })

  await t.test(
    "2. Can create, read, update, delete fabricated Route and Customer",
    async () => {
      await routeRepository.create({
        id: "syn-route-1",
        name: "Synthetic North Route",
      })
      const routes = await routeRepository.getAll()
      assert.strictEqual(routes.length, 1)
      assert.strictEqual(routes[0].name, "Synthetic North Route")

      await customerRepository.create({
        id: "syn-cust-1",
        name: "Fabricated Store A",
        route_id: "syn-route-1",
        opening_credit: 500,
        outstanding_credit: 500,
      })

      const customer = await customerRepository.getById("syn-cust-1")
      assert.ok(customer)
      assert.strictEqual(customer.name, "Fabricated Store A")
      assert.strictEqual(customer.opening_credit, 500)
      assert.strictEqual(customer.outstanding_credit, 500)

      // Update customer
      await customerRepository.update("syn-cust-1", { outstanding_credit: 750 })
      const updated = await customerRepository.getById("syn-cust-1")
      assert.strictEqual(updated?.outstanding_credit, 750)
    },
  )

  await t.test("3. Can record and query fabricated Transactions", async () => {
    await routeRepository.create({ id: "syn-route-1", name: "Route 1" })
    await customerRepository.create({
      id: "syn-cust-1",
      name: "Store 1",
      route_id: "syn-route-1",
      opening_credit: 0,
      outstanding_credit: 0,
    })

    await transactionRepository.create({
      id: "syn-tx-1",
      customer_id: "syn-cust-1",
      type: "sale",
      date: "2026-10-17",
      time: "10:00:00",
      trays: 10,
      amount_to_be_paid: 1800,
      amount_paid: 1000,
      payment_method: "cash",
      credit_kept_today: 800,
      credit_change: 800,
      notes: "Fabricated test sale",
    })

    const txs = await transactionRepository.getByCustomerId("syn-cust-1")
    assert.strictEqual(txs.length, 1)
    assert.strictEqual(txs[0].amount_to_be_paid, 1800)
    assert.strictEqual(txs[0].amount_paid, 1000)
    assert.strictEqual(txs[0].credit_kept_today, 800)
  })

  await t.test("4. Can record and query Purchases and Expenses", async () => {
    await purchaseRepository.create({
      id: "syn-pur-1",
      date: "2026-10-17",
      time: "08:00:00",
      trays: 100,
      total_eggs: 3000,
      egg_type: "normal",
      rate_per_100: 550,
      total_amount: 16500,
    })

    const purchases = await purchaseRepository.getAll()
    assert.strictEqual(purchases.length, 1)
    assert.strictEqual(purchases[0].trays, 100)
    assert.strictEqual(purchases[0].total_eggs, 3000)

    await expenseRepository.create({
      id: "syn-exp-1",
      date: "2026-10-17",
      time: "09:00:00",
      amount: 250,
      purpose: "Diesel",
      payment_method: "cash",
    })

    const expenses = await expenseRepository.getAll()
    assert.strictEqual(expenses.length, 1)
    assert.strictEqual(expenses[0].amount, 250)
  })

  await t.test("5. Transaction rollback restores initial state", async () => {
    await routeRepository.create({ id: "syn-route-tx", name: "Tx Route" })

    await dbInstance.beginTransaction()
    await customerRepository.create({
      id: "syn-cust-rollback",
      name: "To Be Rolled Back",
      route_id: "syn-route-tx",
      opening_credit: 0,
    })

    // Rollback
    await dbInstance.rollbackTransaction()

    const found = await customerRepository.getById("syn-cust-rollback")
    assert.strictEqual(
      found,
      null,
      "Customer created inside aborted transaction must not exist",
    )
  })
})
