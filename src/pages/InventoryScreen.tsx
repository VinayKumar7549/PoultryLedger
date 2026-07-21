import { useState } from 'react'
import { Customer, EggPurchase, EggType } from '../types'
import { today, getTime, fmtDate, uid } from '../utils/date'
import { fmtCurrency, fmtTrays } from '../utils/format'
import { calculateInventoryMetrics } from '../services/inventoryService'
import { CustomEggTypeSelect } from '../components/common/CustomEggTypeSelect'
import {
  IconBack,
  IconTrash,
  IconEdit,
} from '../components/common/Icons'

export function InventoryScreen({
  customers,
  purchases,
  onBack,
  onSavePurchase,
  onUpdatePurchase,
  onDeletePurchase,
}: {
  customers: Record<string, Customer>
  purchases: EggPurchase[]
  onBack: () => void
  onSavePurchase: (p: EggPurchase) => void
  onUpdatePurchase: (p: EggPurchase) => void
  onDeletePurchase: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [eggType, setEggType] = useState<EggType>('normal')
  const [trays, setTrays] = useState('')
  const [ratePer100, setRatePer100] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [purchaseToDelete, setPurchaseToDelete] = useState<EggPurchase | null>(null)

  // Calculations for current form input
  const numTrays = parseInt(trays) || 0
  const totalEggs = numTrays * 30
  const rate = parseFloat(ratePer100) || 0
  const purchaseAmount = (totalEggs * rate) / 100

  // Today's purchase summary metrics with NaN safety
  const safePurchases = purchases || []
  const safeCustomers = customers || {}

  const todayPurchasesList = safePurchases.filter(p => p.date === today)
  const todayTotalCost = todayPurchasesList.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
  const todayPurchasesCount = todayPurchasesList.length

  // Inventory stock calculations using service helper
  const inventory = calculateInventoryMetrics(safePurchases, safeCustomers)

  const handleStartEdit = (p: EggPurchase) => {
    setEditingId(p.id)
    setEggType(p.eggType)
    setTrays(String(p.trays))
    setRatePer100(String(p.ratePer100))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEggType('normal')
    setTrays('')
    setRatePer100('')
  }

  const handleSave = () => {
    if (numTrays <= 0 || rate <= 0) return

    if (editingId) {
      const existing = purchases.find(p => p.id === editingId)
      if (existing) {
        const updated: EggPurchase = {
          ...existing,
          eggType,
          trays: numTrays,
          totalEggs,
          ratePer100: rate,
          totalAmount: purchaseAmount,
        }
        onUpdatePurchase(updated)
        setSavedMsg('Purchase updated!')
      }
    } else {
      const newPurchase: EggPurchase = {
        id: 'p' + uid(),
        date: today,
        time: getTime(),
        trays: numTrays,
        totalEggs,
        eggType,
        ratePer100: rate,
        totalAmount: purchaseAmount,
      }
      onSavePurchase(newPurchase)
      setSavedMsg('Purchase recorded!')
    }

    setEditingId(null)
    setTrays('')
    setRatePer100('')
    setEggType('normal')
    setTimeout(() => setSavedMsg(''), 1500)
  }

  const confirmDelete = () => {
    if (purchaseToDelete) {
      onDeletePurchase(purchaseToDelete.id)
      if (editingId === purchaseToDelete.id) {
        handleCancelEdit()
      }
      setPurchaseToDelete(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
          <IconBack />
        </button>
        <h2 className="flex-1 text-lg font-800 truncate" style={{ fontWeight: 800, color: '#111827' }}>Inventory Management</h2>
      </div>

      {/* Delete Confirmation Modal */}
      {purchaseToDelete && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full flex flex-col gap-3 shadow-2xl"
            style={{ border: '1.5px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#fef2f2', color: '#dc2626' }}
              >
                <IconTrash />
              </div>
              <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>
                Delete Purchase?
              </h3>
            </div>

            <p className="text-sm font-600 mt-1" style={{ color: '#374151', fontWeight: 600 }}>
              Are you sure you want to delete this purchase record?
            </p>

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setPurchaseToDelete(null)}
                className="flex-1 py-3 rounded-xl font-700 text-sm active:scale-95 transition-transform"
                style={{
                  background: 'transparent',
                  border: '2px solid #059669',
                  color: '#059669',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl font-700 text-sm active:scale-95 transition-transform"
                style={{
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* ── Today's Purchase Summary Card (2x2 Grid) ── */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-2.5"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 8px 20px rgba(29,78,216,0.18)' }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-700 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>Today's Purchase Summary</p>
            <span className="text-xs font-600 px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}>{fmtDate(today)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Top Left: Remaining Eggs */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Remaining Eggs</p>
              <p className="text-lg font-800" style={{ color: '#6ee7b7', fontWeight: 800 }}>
                {inventory.remainingEggs.toLocaleString('en-IN')} eggs
              </p>
            </div>

            {/* Top Right: Remaining Trays */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Remaining Trays</p>
              <p className="text-lg font-800" style={{ color: 'white', fontWeight: 800 }}>
                {fmtTrays(inventory.remainingTrays)}
              </p>
            </div>

            {/* Bottom Left: Today's Purchase Cost */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Purchase Cost</p>
              <p className="text-lg font-800" style={{ color: '#93c5fd', fontWeight: 800 }}>
                {fmtCurrency(todayTotalCost)}
              </p>
            </div>

            {/* Bottom Right: Today's Purchases */}
            <div className="rounded-xl p-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Today's Purchases</p>
              <p className="text-lg font-800" style={{ color: 'white', fontWeight: 800 }}>
                {todayPurchasesCount} {todayPurchasesCount === 1 ? 'purchase' : 'purchases'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Record / Edit Purchase Card ── */}
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>
              {editingId ? 'Edit Purchase Record' : 'Record Egg Purchase'}
            </p>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs font-600 px-2.5 py-1 rounded-full"
                style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Custom Egg Type Dropdown */}
            <CustomEggTypeSelect value={eggType} onChange={setEggType} />

            {/* Number of Trays */}
            <div>
              <label className="text-xs font-600 mb-1.5 block" style={{ color: '#6b7280', fontWeight: 600 }}>Number of Trays</label>
              <input
                type="number"
                value={trays}
                onChange={e => setTrays(e.target.value)}
                placeholder="e.g. 50"
                className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
                style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Rate per 100 Eggs */}
          <div>
            <label className="text-xs font-600 mb-1 block" style={{ color: '#6b7280', fontWeight: 600 }}>Rate per 100 Eggs (₹)</label>
            <input
              type="number"
              value={ratePer100}
              onChange={e => setRatePer100(e.target.value)}
              placeholder="e.g. 210"
              className="w-full rounded-xl px-3.5 py-3 text-base font-700 border outline-none bg-white focus:border-emerald-500 transition-colors"
              style={{ borderColor: '#d1fae5', color: '#111827', fontWeight: 700 }}
            />
          </div>

          {/* Auto Calculation Banner */}
          <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-600" style={{ color: '#065f46', fontWeight: 600 }}>Purchase Amount</span>
              <span className="text-xl font-800" style={{ fontWeight: 800, color: '#059669' }}>
                {fmtCurrency(purchaseAmount)}
              </span>
            </div>
            {numTrays > 0 && (
              <p className="text-xs font-600 mt-0.5" style={{ color: '#047857', fontWeight: 600 }}>
                Total Eggs: {totalEggs.toLocaleString('en-IN')} eggs ({numTrays} trays × 30)
              </p>
            )}
            {numTrays > 0 && rate > 0 && (
              <p className="text-xs font-600" style={{ color: '#047857', fontWeight: 600 }}>
                ({numTrays} trays × 30 × ₹{rate}) / 100 = {fmtCurrency(purchaseAmount)}
              </p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={numTrays <= 0 || rate <= 0}
            className="w-full py-3.5 rounded-xl text-sm font-800 active:scale-98 transition-all shadow-md mt-1"
            style={{
              background: numTrays > 0 && rate > 0 ? '#059669' : '#9ca3af',
              color: 'white',
              fontWeight: 800,
            }}
          >
            {savedMsg ? '✓ ' + savedMsg : editingId ? 'Update Purchase Record' : 'Save Purchase'}
          </button>
        </div>

        {/* ── Purchase History Log ── */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-700" style={{ color: '#374151', fontWeight: 700 }}>
            Purchase History Log
          </p>

          {purchases.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: '#6b7280' }}>
              No purchase records recorded yet.
            </div>
          ) : (
            purchases.map(p => (
              <div
                key={p.id}
                className="rounded-2xl p-4 flex flex-col gap-2.5"
                style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
              >
                {/* Top Row: Date, Type & Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-700 px-2.5 py-0.5 rounded-full"
                      style={{
                        background: p.eggType === 'damaged' ? '#fef2f2' : '#d1fae5',
                        color: p.eggType === 'damaged' ? '#dc2626' : '#065f46',
                        fontWeight: 700,
                      }}
                    >
                      {p.eggType === 'damaged' ? 'Broken / Damaged' : 'Normal Stock'}
                    </span>
                    <span className="text-xs" style={{ color: '#9ca3af' }}>
                      {fmtDate(p.date)} · {p.time}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-200"
                      style={{ color: '#059669' }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => setPurchaseToDelete(p)}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:bg-red-100"
                      style={{ color: '#dc2626' }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#e5e7eb' }} />

                {/* Calculation Details */}
                <div className="flex items-center justify-between text-xs" style={{ color: '#4b5563' }}>
                  <span>
                    Trays: <strong style={{ color: '#111827' }}>{p.trays} trays</strong> ({p.totalEggs} eggs)
                  </span>
                  <span>
                    Rate: <strong style={{ color: '#111827' }}>₹{p.ratePer100} / 100</strong>
                  </span>
                </div>

                {/* Total Cost */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-600" style={{ color: '#6b7280', fontWeight: 600 }}>Total Cost:</span>
                  <span className="text-base font-800" style={{ fontWeight: 800, color: '#111827' }}>
                    {fmtCurrency(p.totalAmount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
