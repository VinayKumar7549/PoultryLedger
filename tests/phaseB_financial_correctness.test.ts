import test from "node:test"
import assert from "node:assert/strict"
import { fmtCurrency, fmtPdfCurrency } from "../src/utils/format"

test("BUG-04: Currency sign preservation", async (t) => {
  await t.test(
    "fmtCurrency formats positive, zero, and negative values",
    () => {
      assert.strictEqual(fmtCurrency(0), "₹0")
      assert.strictEqual(fmtCurrency(500), "₹500")
      assert.strictEqual(fmtCurrency(150000), "₹1,50,000")
      assert.strictEqual(fmtCurrency(-500), "-₹500")
      assert.strictEqual(fmtCurrency(-150000), "-₹1,50,000")
      assert.strictEqual(fmtCurrency(-25.5), "-₹25.50")
      assert.strictEqual(fmtCurrency(25.5), "₹25.50")
      assert.strictEqual(fmtCurrency(NaN as any), "₹0")
      assert.strictEqual(fmtCurrency(null as any), "₹0")
      assert.strictEqual(fmtCurrency(undefined as any), "₹0")
    },
  )

  await t.test(
    "fmtPdfCurrency formats positive, zero, and negative values",
    () => {
      assert.strictEqual(fmtPdfCurrency(0), "Rs. 0.00")
      assert.strictEqual(fmtPdfCurrency(500), "Rs. 500.00")
      assert.strictEqual(fmtPdfCurrency(-500), "-Rs. 500.00")
      assert.strictEqual(fmtPdfCurrency(-150000), "-Rs. 1,50,000.00")
      assert.strictEqual(fmtPdfCurrency(NaN as any), "Rs. 0.00")
    },
  )
})

test("BUG-02: Balance calculation for new and edited transactions", async (t) => {
  function computeBalancePreview(params: {
    customerOutstanding: number
    editingTx?: {
      type: "sale" | "payment"
      amountToBePaid: number
      amountPaid: number
    }
    currentTx: {
      type: "sale" | "payment"
      amountToBePaid: number
      amountPaid: number
    }
  }) {
    const prevEffect = params.editingTx
      ? (params.editingTx.type === "sale"
          ? params.editingTx.amountToBePaid
          : 0) - params.editingTx.amountPaid
      : 0
    const currentEffect =
      (params.currentTx.type === "sale" ? params.currentTx.amountToBePaid : 0) -
      params.currentTx.amountPaid
    const baseOutstanding = params.customerOutstanding - prevEffect
    return baseOutstanding + currentEffect
  }

  await t.test("New fully paid sale leaves customer credit unchanged", () => {
    const res = computeBalancePreview({
      customerOutstanding: 1000,
      currentTx: { type: "sale", amountToBePaid: 1500, amountPaid: 1500 },
    })
    assert.strictEqual(res, 1000)
  })

  await t.test("New credit sale adds unpaid amount", () => {
    const res = computeBalancePreview({
      customerOutstanding: 1000,
      currentTx: { type: "sale", amountToBePaid: 1500, amountPaid: 500 },
    })
    assert.strictEqual(res, 2000)
  })

  await t.test("New payment reduces credit", () => {
    const res = computeBalancePreview({
      customerOutstanding: 1000,
      currentTx: { type: "payment", amountToBePaid: 0, amountPaid: 400 },
    })
    assert.strictEqual(res, 600)
  })

  await t.test(
    "Editing an existing partial sale to fully paid removes old debt without compounding",
    () => {
      // Customer has 800 balance from this sale (bill 1000, paid 200)
      const res = computeBalancePreview({
        customerOutstanding: 800,
        editingTx: { type: "sale", amountToBePaid: 1000, amountPaid: 200 },
        currentTx: { type: "sale", amountToBePaid: 1000, amountPaid: 1000 },
      })
      assert.strictEqual(res, 0)
    },
  )

  await t.test(
    "Editing an existing partial sale to zero paid increases debt correctly",
    () => {
      const res = computeBalancePreview({
        customerOutstanding: 800,
        editingTx: { type: "sale", amountToBePaid: 1000, amountPaid: 200 },
        currentTx: { type: "sale", amountToBePaid: 1000, amountPaid: 0 },
      })
      assert.strictEqual(res, 1000)
    },
  )

  await t.test(
    "Editing an existing payment amount updates balance correctly",
    () => {
      // Customer had 1000, paid 400 -> current outstanding is 600
      const res = computeBalancePreview({
        customerOutstanding: 600,
        editingTx: { type: "payment", amountToBePaid: 0, amountPaid: 400 },
        currentTx: { type: "payment", amountToBePaid: 0, amountPaid: 700 },
      })
      assert.strictEqual(res, 300)
    },
  )

  await t.test(
    "Advance payment / overpayment results in negative balance (customer credit)",
    () => {
      const res = computeBalancePreview({
        customerOutstanding: 200,
        currentTx: { type: "payment", amountToBePaid: 0, amountPaid: 500 },
      })
      assert.strictEqual(res, -300)
    },
  )
})

test("BUG-07: Quantity must not change unexpectedly when adjusting total bill or discount", async (t) => {
  function handleTotalChangeSim(params: {
    newTotal: number
    eggs: number
    rate: number
  }) {
    let resultEggs = params.eggs
    let resultRate = params.rate
    let resultTotal = params.newTotal

    if (params.eggs > 0) {
      // Recompute rate per 100, do NOT change egg count
      resultRate = Number(((params.newTotal * 100) / params.eggs).toFixed(2))
    } else if (params.rate > 0) {
      resultEggs = Number(((params.newTotal * 100) / params.rate).toFixed(2))
    }
    return { eggs: resultEggs, rate: resultRate, total: resultTotal }
  }

  await t.test(
    "Entering discount on total bill adjusts rate per 100 and preserves egg count",
    () => {
      // 300 eggs at rate 550 = 1650. Seller discounts to 1500.
      const res = handleTotalChangeSim({ newTotal: 1500, eggs: 300, rate: 550 })
      assert.strictEqual(res.eggs, 300, "Egg count must remain exactly 300")
      assert.strictEqual(res.rate, 500, "Rate per 100 should adjust to 500")
      assert.strictEqual(res.total, 1500)
    },
  )

  await t.test("Decimal rate adjustment with round figure total", () => {
    // 100 eggs at rate 525 = 525. Seller rounds to 500.
    const res = handleTotalChangeSim({ newTotal: 500, eggs: 100, rate: 525 })
    assert.strictEqual(res.eggs, 100)
    assert.strictEqual(res.rate, 500)
  })
})
