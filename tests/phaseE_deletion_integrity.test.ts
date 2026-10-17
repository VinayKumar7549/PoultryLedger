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
import { customerService } from "../src/services/customerService"
import { routeService } from "../src/services/routeService"

test("Phase E — Customer Deletion and Database Integrity Investigation", async (t) => {
  let harness: SyntheticSqliteHarness

  beforeEach(async () => {
    harness = setupSyntheticTestDb()
  })

  afterEach(() => {
    teardownSyntheticTestDb()
  })

  await t.test(
    "1. Deleting a customer with no transactions succeeds cleanly without orphans",
    async () => {
      await routeRepository.create({ id: "r-del", name: "Route Clean" })
      await customerRepository.create({
        id: "c-clean",
        name: "Clean Customer",
        route_id: "r-del",
        opening_credit: 0,
        outstanding_credit: 0,
      })

      // Verify created
      let cust = await customerRepository.getById("c-clean")
      assert.ok(cust)

      // Delete customer
      await customerService.deleteCustomer("c-clean")
      cust = await customerRepository.getById("c-clean")
      assert.strictEqual(cust, null, "Customer should be deleted")

      // Check orphan transactions
      const orphans = harness.rawQuery(
        `SELECT t.id FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE c.id IS NULL`,
      )
      assert.strictEqual(
        orphans.length,
        0,
        "There should be 0 orphan transactions",
      )
    },
  )

  await t.test(
    "2. Current deletion behavior on a customer with transactions leaves orphan rows in SQLite without FK pragma",
    async () => {
      await routeRepository.create({ id: "r-orphan", name: "Route Orphan" })
      await customerRepository.create({
        id: "c-with-tx",
        name: "Customer With Sales",
        route_id: "r-orphan",
        opening_credit: 0,
        outstanding_credit: 0,
      })

      await transactionRepository.create({
        id: "tx-orphan-1",
        customer_id: "c-with-tx",
        type: "sale",
        date: "2026-10-17",
        time: "09:00:00",
        trays: 10,
        amount_to_be_paid: 1800,
        amount_paid: 1800,
        payment_method: "cash",
        credit_kept_today: 0,
        credit_change: 0,
      })

      // Delete customer using current repository delete
      await customerRepository.delete("c-with-tx")

      // Customer row is deleted
      const cust = await customerRepository.getById("c-with-tx")
      assert.strictEqual(cust, null)

      // In current un-enforced SQLite, transaction row remains
      const orphans = harness.rawQuery<{ id: string }>(
        `SELECT t.id FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE c.id IS NULL`,
      )
      assert.strictEqual(
        orphans.length,
        1,
        "Proves that deleting a customer leaves orphan transactions when FK is disabled",
      )
      assert.strictEqual(orphans[0].id, "tx-orphan-1")
    },
  )

  await t.test("3. Deleting a route with customers", async () => {
    await routeRepository.create({ id: "r-multi", name: "Multi Route" })
    await customerRepository.create({
      id: "c-m1",
      name: "Cust 1",
      route_id: "r-multi",
    })
    await customerRepository.create({
      id: "c-m2",
      name: "Cust 2",
      route_id: "r-multi",
    })

    // Delete route
    await routeService.deleteRoute("r-multi")

    const remainingRoutes = await routeRepository.getAll()
    assert.strictEqual(
      remainingRoutes.find((r) => r.id === "r-multi"),
      undefined,
    )

    // Check orphan customers (customers pointing to non-existent route)
    const orphanCustomers = harness.rawQuery<{ id: string }>(
      `SELECT c.id FROM customers c LEFT JOIN routes r ON c.route_id = r.id WHERE r.id IS NULL`,
    )
    assert.strictEqual(
      orphanCustomers.length,
      2,
      "Customers remain orphan when route is deleted without cascade/reassignment",
    )
  })

  await t.test(
    "4. Orphan transaction detection query accurately flags disconnected records",
    async () => {
      // Insert an isolated transaction pointing to nonexistent customer
      harness.rawExec(`
      INSERT INTO transactions (id, customer_id, type, date, time, trays, amount_to_be_paid, amount_paid, payment_method, credit_kept_today, credit_change, created_at, updated_at)
      VALUES ('tx-ghost', 'nonexistent-cust', 'sale', '2026-10-17', '10:00:00', 5, 900, 900, 'cash', 0, 0, '2026-10-17', '2026-10-17');
    `)

      const orphans = harness.rawQuery<{ id: string; customer_id: string }>(
        `SELECT t.id, t.customer_id FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id WHERE c.id IS NULL`,
      )
      assert.strictEqual(orphans.length, 1)
      assert.strictEqual(orphans[0].id, "tx-ghost")
      assert.strictEqual(orphans[0].customer_id, "nonexistent-cust")
    },
  )

  await t.test(
    "5. Backup and restore containing historical transactions preserves all records without data loss",
    async () => {
      const { backupService } = await import("../src/services/backupService")

      await routeRepository.create({ id: "r-bak", name: "Backup Route" })
      await customerRepository.create({
        id: "c-bak",
        name: "Backup Customer",
        route_id: "r-bak",
      })
      await transactionRepository.create({
        id: "tx-bak",
        customer_id: "c-bak",
        type: "sale",
        date: "2026-10-17",
        time: "10:00:00",
        trays: 10,
        amount_to_be_paid: 1800,
        amount_paid: 1800,
        payment_method: "cash",
        credit_kept_today: 0,
        credit_change: 0,
      })

      const backup = await backupService.createBackup()
      assert.strictEqual(backup.data.customers.length, 1)
      assert.strictEqual(backup.data.transactions.length, 1)

      // Simulate database reset
      harness.reset()
      assert.strictEqual((await customerRepository.getAll()).length, 0)
      assert.strictEqual((await transactionRepository.getAll()).length, 0)

      // Restore from backup
      const result = await backupService.restoreBackup(backup)
      assert.strictEqual(result.success, true)
      assert.strictEqual((await customerRepository.getAll()).length, 1)
      assert.strictEqual((await transactionRepository.getAll()).length, 1)
      assert.strictEqual(
        (await customerRepository.getById("c-bak"))?.name,
        "Backup Customer",
      )
    },
  )

  await t.test(
    "6. Safe deletion policy: check customer transactions before deletion",
    async () => {
      await routeRepository.create({ id: "r-safe", name: "Safe Route" })
      await customerRepository.create({
        id: "c-safe",
        name: "Safe Cust",
        route_id: "r-safe",
      })

      // When customer has no transactions
      let txs = await transactionRepository.getByCustomerId("c-safe")
      assert.strictEqual(
        txs.length,
        0,
        "Customer has 0 transactions, safe to delete",
      )

      // Record transaction
      await transactionRepository.create({
        id: "tx-safe-1",
        customer_id: "c-safe",
        type: "sale",
        date: "2026-10-17",
        time: "10:00:00",
        trays: 5,
        amount_to_be_paid: 900,
        amount_paid: 900,
        payment_method: "cash",
        credit_kept_today: 0,
        credit_change: 0,
      })

      txs = await transactionRepository.getByCustomerId("c-safe")
      assert.strictEqual(
        txs.length,
        1,
        "Customer has 1 transaction; deletion policy flags active business history",
      )
    },
  )
})
