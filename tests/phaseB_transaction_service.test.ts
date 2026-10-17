import test, { beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  setupSyntheticTestDb,
  teardownSyntheticTestDb,
  SyntheticSqliteHarness,
} from "./helpers/syntheticDb"
import { customerRepository } from "../src/database/repositories/CustomerRepository"
import { routeRepository } from "../src/database/repositories/RouteRepository"
import { transactionService } from "../src/services/transactionService"
import { creditService } from "../src/services/creditService"
import { Transaction } from "../src/types"

test("Phase B — End-to-end Transaction and Credit Balance Verification on Synthetic SQLite", async (t) => {
  let harness: SyntheticSqliteHarness

  beforeEach(async () => {
    harness = setupSyntheticTestDb()
    await routeRepository.create({ id: "r1", name: "Route 1" })
  })

  afterEach(() => {
    teardownSyntheticTestDb()
  })

  await t.test(
    "1. Customer with opening balance calculates correct outstanding credit",
    async () => {
      await customerRepository.create({
        id: "c1",
        name: "Customer 1",
        route_id: "r1",
        opening_credit: 1200,
        outstanding_credit: 1200,
      })

      const credit = await creditService.getCustomerOutstanding("c1")
      assert.strictEqual(credit, 1200)
    },
  )

  await t.test(
    "2. Fully paid sale leaves customer balance equal to opening balance",
    async () => {
      await customerRepository.create({
        id: "c2",
        name: "Customer 2",
        route_id: "r1",
        opening_credit: 500,
        outstanding_credit: 500,
      })

      const saleTx: Transaction = {
        id: "tx-sale-1",
        customerId: "c2",
        type: "sale",
        date: "2026-10-17",
        time: "09:00:00",
        trays: 10,
        amountToBePaid: 1500,
        amountPaid: 1500,
        paymentMethod: "cash",
        creditKeptToday: 0,
        creditChange: 0,
      }

      await transactionService.createTransaction(saleTx)
      const cust = await customerRepository.getById("c2")
      assert.strictEqual(cust?.outstanding_credit, 500)
    },
  )

  await t.test("3. Partial sale increases customer balance", async () => {
    await customerRepository.create({
      id: "c3",
      name: "Customer 3",
      route_id: "r1",
      opening_credit: 0,
      outstanding_credit: 0,
    })

    const partialSale: Transaction = {
      id: "tx-sale-2",
      customerId: "c3",
      type: "sale",
      date: "2026-10-17",
      time: "10:00:00",
      trays: 10,
      amountToBePaid: 1800,
      amountPaid: 1000,
      paymentMethod: "cash",
      creditKeptToday: 800,
      creditChange: -800,
    }

    await transactionService.createTransaction(partialSale)
    const cust = await customerRepository.getById("c3")
    assert.strictEqual(cust?.outstanding_credit, 800)
  })

  await t.test(
    "4. Editing an existing sale from partial to full payment recalculates customer balance correctly (BUG-02 in DB)",
    async () => {
      await customerRepository.create({
        id: "c4",
        name: "Customer 4",
        route_id: "r1",
        opening_credit: 0,
        outstanding_credit: 0,
      })

      // Create partial sale: 1800 bill, 1000 paid -> 800 credit
      const partialSale: Transaction = {
        id: "tx-sale-3",
        customerId: "c4",
        type: "sale",
        date: "2026-10-17",
        time: "10:00:00",
        trays: 10,
        amountToBePaid: 1800,
        amountPaid: 1000,
        paymentMethod: "cash",
        creditKeptToday: 800,
        creditChange: -800,
      }
      await transactionService.createTransaction(partialSale)

      // Edit transaction: now fully paid (1800 bill, 1800 paid)
      const updatedSale: Transaction = {
        ...partialSale,
        amountPaid: 1800,
        creditKeptToday: 0,
        creditChange: 0,
      }
      await transactionService.updateTransaction(updatedSale)

      const cust = await customerRepository.getById("c4")
      assert.strictEqual(
        cust?.outstanding_credit,
        0,
        "Customer credit should be 0 after full payment update",
      )
    },
  )

  await t.test(
    "5. Payment-only transaction reduces customer balance",
    async () => {
      await customerRepository.create({
        id: "c5",
        name: "Customer 5",
        route_id: "r1",
        opening_credit: 1000,
        outstanding_credit: 1000,
      })

      const paymentTx: Transaction = {
        id: "tx-pay-1",
        customerId: "c5",
        type: "payment",
        date: "2026-10-17",
        time: "11:00:00",
        trays: 0,
        amountToBePaid: 0,
        amountPaid: 600,
        paymentMethod: "online",
        creditKeptToday: 0,
        creditChange: 600,
      }
      await transactionService.createTransaction(paymentTx)

      const cust = await customerRepository.getById("c5")
      assert.strictEqual(cust?.outstanding_credit, 400)
    },
  )

  await t.test(
    "6. Advance payment makes customer balance negative (credit with seller)",
    async () => {
      await customerRepository.create({
        id: "c6",
        name: "Customer 6",
        route_id: "r1",
        opening_credit: 200,
        outstanding_credit: 200,
      })

      const advanceTx: Transaction = {
        id: "tx-pay-adv",
        customerId: "c6",
        type: "payment",
        date: "2026-10-17",
        time: "11:30:00",
        trays: 0,
        amountToBePaid: 0,
        amountPaid: 500,
        paymentMethod: "cash",
        creditKeptToday: 0,
        creditChange: 500,
      }
      await transactionService.createTransaction(advanceTx)

      const cust = await customerRepository.getById("c6")
      assert.strictEqual(
        cust?.outstanding_credit,
        -300,
        "Customer credit should reflect -300 advance",
      )
    },
  )

  await t.test(
    "7. Deleting a transaction recalculates customer balance correctly",
    async () => {
      await customerRepository.create({
        id: "c7",
        name: "Customer 7",
        route_id: "r1",
        opening_credit: 0,
        outstanding_credit: 0,
      })

      const tx: Transaction = {
        id: "tx-to-delete",
        customerId: "c7",
        type: "sale",
        date: "2026-10-17",
        time: "12:00:00",
        trays: 5,
        amountToBePaid: 900,
        amountPaid: 0,
        paymentMethod: "cash",
        creditKeptToday: 900,
        creditChange: -900,
      }
      await transactionService.createTransaction(tx)
      let cust = await customerRepository.getById("c7")
      assert.strictEqual(cust?.outstanding_credit, 900)

      // Delete transaction
      await transactionService.deleteTransaction("tx-to-delete", "c7")
      cust = await customerRepository.getById("c7")
      assert.strictEqual(
        cust?.outstanding_credit,
        0,
        "Customer credit must return to 0 after deleting sale",
      )
    },
  )
})
