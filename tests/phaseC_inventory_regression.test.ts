import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  setupSyntheticTestDb,
  teardownSyntheticTestDb,
  SyntheticSqliteHarness,
} from "./helpers/syntheticDb"
import { routeRepository } from "../src/database/repositories/RouteRepository"
import { customerRepository } from "../src/database/repositories/CustomerRepository"
import { purchaseRepository } from "../src/database/repositories/PurchaseRepository"
import { transactionRepository } from "../src/database/repositories/TransactionRepository"
import { getSQLiteInventoryMetrics } from "../src/services/inventoryService"

test("Phase C — 14-Step Authoritative Inventory Regression Sequence", async (t) => {
  let harness: SyntheticSqliteHarness

  beforeEach(async () => {
    harness = setupSyntheticTestDb()
    await routeRepository.create({ id: "r1", name: "Route 1" })
    await customerRepository.create({
      id: "c1",
      name: "Customer 1",
      route_id: "r1",
      opening_credit: 0,
      outstanding_credit: 0,
    })
  })

  afterEach(() => {
    teardownSyntheticTestDb()
  })

  await t.test("Execute 14-step inventory regression sequence", async () => {
    // 0. Initial state check: 0 stock
    let metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      0,
      "Initial remaining eggs must be 0",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      0,
      "Initial remaining trays must be 0",
    )

    // Step 1: Purchase 100 trays = 3,000 eggs
    await purchaseRepository.create({
      id: "p-step-1",
      date: "2026-10-17",
      time: "08:00:00",
      trays: 100,
      total_eggs: 3000,
      egg_type: "normal",
      rate_per_100: 550,
      total_amount: 16500,
    })
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      3000,
      "Step 1: Remaining eggs should be 3000",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      100,
      "Step 1: Remaining trays should be 100",
    )

    // Step 2: Record a sale of 300 eggs (10 trays)
    await transactionRepository.create({
      id: "tx-step-2",
      customer_id: "c1",
      type: "sale",
      date: "2026-10-17",
      time: "09:00:00",
      trays: 10, // 300 eggs
      amount_to_be_paid: 1800,
      amount_paid: 1800,
      payment_method: "cash",
      credit_kept_today: 0,
      credit_change: 0,
    })

    // Step 3: Confirm 2,700 eggs remain (90 trays)
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      2700,
      "Step 3: Confirm 2,700 eggs remain",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      90,
      "Step 3: Confirm 90 trays remain",
    )

    // Step 4: Edit the sale to 240 eggs (8 trays)
    await transactionRepository.update("tx-step-2", {
      trays: 8, // 240 eggs
      amount_to_be_paid: 1440,
      amount_paid: 1440,
    })

    // Step 5: Confirm 2,760 eggs remain (92 trays)
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      2760,
      "Step 5: Confirm 2,760 eggs remain",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      92,
      "Step 5: Confirm 92 trays remain",
    )

    // Step 6: Change the sale rate without changing quantity (e.g. rate changes, amount changes)
    await transactionRepository.update("tx-step-2", {
      amount_to_be_paid: 1400, // discounted rate
      amount_paid: 1400,
    })

    // Step 7: Confirm inventory remains 2,760 eggs
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      2760,
      "Step 7: Confirm inventory remains 2,760 eggs",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      92,
      "Step 7: Confirm inventory remains 92 trays",
    )

    // Step 8: Record a payment-only transaction
    await transactionRepository.create({
      id: "tx-step-8-pay",
      customer_id: "c1",
      type: "payment",
      date: "2026-10-17",
      time: "11:00:00",
      trays: 0,
      amount_to_be_paid: 0,
      amount_paid: 500,
      payment_method: "cash",
      credit_kept_today: 0,
      credit_change: 500,
    })

    // Step 9: Confirm inventory is unchanged (2,760 eggs)
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      2760,
      "Step 9: Inventory must remain 2,760 eggs after payment",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      92,
      "Step 9: Inventory must remain 92 trays after payment",
    )

    // Step 10: Delete the sale
    await transactionRepository.delete("tx-step-2")

    // Step 11: Confirm inventory returns to 3,000 eggs
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      3000,
      "Step 11: Confirm inventory returns to 3,000 eggs",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      100,
      "Step 11: Confirm inventory returns to 100 trays",
    )

    // Step 12: Edit and delete a purchase and verify the corresponding stock differences
    // Edit purchase from 3000 to 2400 eggs (80 trays)
    await purchaseRepository.update("p-step-1", {
      trays: 80,
      total_eggs: 2400,
      total_amount: 13200,
    })
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      2400,
      "Step 12a: Stock decreases to 2,400 eggs after editing purchase",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      80,
      "Step 12a: Stock decreases to 80 trays",
    )

    // Delete purchase
    await purchaseRepository.delete("p-step-1")
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      0,
      "Step 12b: Stock returns to 0 after deleting purchase",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      0,
      "Step 12b: Trays returns to 0",
    )

    // Step 13: Test a quantity that is not a multiple of 30 (loose eggs)
    // Purchase 5 trays + 15 loose eggs = 165 eggs (5.5 trays)
    await purchaseRepository.create({
      id: "p-loose-1",
      date: "2026-10-17",
      time: "12:00:00",
      trays: 5.5,
      total_eggs: 165,
      egg_type: "normal",
      rate_per_100: 500,
      total_amount: 825,
    })
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      165,
      "Step 13a: Total eggs must be exactly 165",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      5.5,
      "Step 13a: Total trays must be exactly 5.5",
    )

    // Sell 45 eggs (1.5 trays)
    await transactionRepository.create({
      id: "tx-loose-sale",
      customer_id: "c1",
      type: "sale",
      date: "2026-10-17",
      time: "12:30:00",
      trays: 1.5, // 45 eggs
      amount_to_be_paid: 270,
      amount_paid: 270,
      payment_method: "cash",
      credit_kept_today: 0,
      credit_change: 0,
    })
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      120,
      "Step 13b: 165 - 45 = 120 eggs",
    )
    assert.strictEqual(
      metrics.remainingTrays,
      4,
      "Step 13b: 120 / 30 = 4 trays",
    )

    // Step 14: Test a negative stock discrepancy and ensure it is visible rather than silently reported as zero
    // Sell another 200 eggs (only 120 remain -> deficit of -80 eggs)
    await transactionRepository.create({
      id: "tx-oversold",
      customer_id: "c1",
      type: "sale",
      date: "2026-10-17",
      time: "13:00:00",
      trays: 200 / 30, // 6.6667 trays
      amount_to_be_paid: 1200,
      amount_paid: 1200,
      payment_method: "cash",
      credit_kept_today: 0,
      credit_change: 0,
    })
    metrics = await getSQLiteInventoryMetrics()
    assert.strictEqual(
      metrics.remainingEggs,
      -80,
      "Step 14: Negative deficit must be visible as -80 eggs, NOT clamped to 0",
    )
    assert.strictEqual(
      Number(metrics.remainingTrays.toFixed(2)),
      -2.67,
      "Step 14: Negative deficit in trays must be visible",
    )
  })
})
