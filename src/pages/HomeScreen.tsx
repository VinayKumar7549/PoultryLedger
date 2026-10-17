import { useState, useEffect } from "react"
import {
  Customer,
  Expense,
  EggPurchase,
  Screen,
  BusinessProfile,
} from "../types"
import { RouteEntity } from "../database"
import { getTodayStr, fmtDate } from "../utils/date"
import { fmtCurrency, fmtTrays } from "../utils/format"
import {
  dashboardService,
  DashboardMetrics,
} from "../services/dashboardService"
import { RECENT_CUSTOMERS_LIMIT } from "../services/recentCustomersService"
import { SearchBar } from "../components/common/SearchBar"
import {
  IconRoute,
  IconWallet,
  IconHistory,
  IconBox,
  IconChevronRight,
  IconPlus,
  IconMenu,
} from "../components/common/Icons"

export function HomeScreen({
  customers,
  expenses,
  purchases,
  routes,
  routeNames,
  recentCustomerIds,
  navigate,
  onCreateRoute,
  onMenuOpen,
  businessProfile,
}: {
  customers: Record<string, Customer>
  expenses: Expense[]
  purchases: EggPurchase[]
  routes?: RouteEntity[]
  routeNames?: Record<string, string>
  recentCustomerIds?: string[]
  navigate: (s: Screen, r?: string, c?: string) => void
  onCreateRoute?: (name: string) => void
  onMenuOpen?: () => void
  businessProfile?: BusinessProfile | null
}) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
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
  })

  const [showAddRouteModal, setShowAddRouteModal] = useState(false)
  const [newRouteName, setNewRouteName] = useState("")
  const [routeSearchQuery, setRouteSearchQuery] = useState("")

  const filteredRoutes = (routes || []).filter((r) => {
    if (!routeSearchQuery.trim()) return true
    return r.name.toLowerCase().includes(routeSearchQuery.toLowerCase().trim())
  })

  const handleSaveRoute = () => {
    if (!newRouteName.trim()) return
    if (onCreateRoute) {
      onCreateRoute(newRouteName.trim())
    }
    setNewRouteName("")
    setShowAddRouteModal(false)
  }

  useEffect(() => {
    dashboardService.getDashboardMetrics().then((res) => {
      setMetrics(res)
    })
  }, [customers, expenses, purchases])

  const business = {
    todaySales: metrics.todaySales,
    todayCreditGiven: metrics.todayCreditGiven,
    totalOutstandingCredit: metrics.totalOutstandingCredit,
    todayGrossProfit: metrics.todayGrossProfit,
    lastMonthGrossProfit: metrics.lastMonthGrossProfit,
    lastMonthOutstandingCredit: metrics.lastMonthOutstandingCredit,
  }
  const inventory = metrics.inventory

  const recentCustomersList = (recentCustomerIds || [])
    .map((id) => customers[id])
    .filter((c): c is Customer => Boolean(c))
    .slice(0, RECENT_CUSTOMERS_LIMIT)

  return (
    <div className="flex flex-col h-full bg-slate-50 px-4 pt-3 pb-8 overflow-y-auto relative">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between py-2 mb-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          {onMenuOpen && (
            <button
              onClick={onMenuOpen}
              title="Open Navigation Menu"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-700 active:scale-95 transition-transform"
            >
              <IconMenu />
            </button>
          )}
          <div>
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">
              {businessProfile?.businessName || "Sai Egg Center"}
            </h1>
            <p className="text-[11px] font-semibold text-gray-500">
              {businessProfile?.ownerName
                ? `Prop: ${businessProfile.ownerName}`
                : "Daily Deliveries & Sales"}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {fmtDate(getTodayStr())}
        </span>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* ── Business Summary Card ── */}
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: "#f9fafb", border: "1.5px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-sm font-700"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Business Summary
            </p>
            <span
              className="text-xs font-600 px-2.5 py-0.5 rounded-full"
              style={{
                background: "#d1fae5",
                color: "#065f46",
                fontWeight: 600,
              }}
            >
              Today
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Today's Sales */}
            <div
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid #f3f4f6" }}
            >
              <p className="text-xs font-500" style={{ color: "#6b7280" }}>
                Today's Sales
              </p>
              <p
                className="text-lg font-800 mt-0.5"
                style={{ color: "#059669", fontWeight: 800 }}
              >
                {fmtCurrency(business.todaySales)}
              </p>
            </div>

            {/* Today's Credit Given */}
            <div
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid #f3f4f6" }}
            >
              <p className="text-xs font-500" style={{ color: "#6b7280" }}>
                Today's Credit Given
              </p>
              <p
                className="text-lg font-800 mt-0.5"
                style={{ color: "#dc2626", fontWeight: 800 }}
              >
                {fmtCurrency(business.todayCreditGiven)}
              </p>
            </div>

            {/* Total Outstanding Credit */}
            <div
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid #f3f4f6" }}
            >
              <p className="text-xs font-500" style={{ color: "#6b7280" }}>
                Total Outstanding Credit
              </p>
              <p
                className="text-lg font-800 mt-0.5"
                style={{ color: "#dc2626", fontWeight: 800 }}
              >
                {fmtCurrency(business.totalOutstandingCredit)}
              </p>
            </div>

            {/* Today's Gross Profit */}
            <div
              className="rounded-xl p-3"
              style={{ background: "white", border: "1px solid #f3f4f6" }}
            >
              <p className="text-xs font-500" style={{ color: "#6b7280" }}>
                Today's Gross Profit
              </p>
              <p
                className="text-lg font-800 mt-0.5"
                style={{
                  color: business.todayGrossProfit >= 0 ? "#059669" : "#dc2626",
                  fontWeight: 800,
                }}
              >
                {fmtCurrency(business.todayGrossProfit)}
              </p>
            </div>
          </div>

          {/* Month-over-Month Comparisons */}
          <div style={{ height: "1px", background: "#e5e7eb" }} />
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <div>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                Last Month Gross Profit
              </p>
              <p
                className="text-sm font-700 mt-0.5"
                style={{ color: "#374151", fontWeight: 700 }}
              >
                {fmtCurrency(business.lastMonthGrossProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                Last Month Credit Given
              </p>
              <p
                className="text-sm font-700 mt-0.5"
                style={{ color: "#374151", fontWeight: 700 }}
              >
                {fmtCurrency(business.lastMonthOutstandingCredit)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Inventory Summary Card (2x2 Grid) ── */}
        <button
          onClick={() => navigate("inventory")}
          className="w-full rounded-2xl p-4 flex flex-col gap-3 active:scale-98 transition-transform text-left"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            boxShadow: "0 8px 20px rgba(29,78,216,0.18)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <div style={{ color: "white" }}>
                  <IconBox />
                </div>
              </div>
              <p
                className="text-base font-800"
                style={{ color: "white", fontWeight: 800 }}
              >
                Inventory Summary
              </p>
            </div>
            <div
              className="flex items-center gap-1 text-xs font-700 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
            >
              <span>Manage</span>
              <IconChevronRight />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Top Left: Remaining Eggs */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(0,0,0,0.15)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Remaining Eggs
              </p>
              <p
                className="text-lg font-800"
                style={{ color: "#6ee7b7", fontWeight: 800 }}
              >
                {inventory.remainingEggs.toLocaleString("en-IN")} eggs
              </p>
            </div>

            {/* Top Right: Remaining Trays */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(0,0,0,0.15)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Remaining Trays
              </p>
              <p
                className="text-lg font-800"
                style={{ color: "white", fontWeight: 800 }}
              >
                {fmtTrays(inventory.remainingTrays)}
              </p>
            </div>

            {/* Bottom Left: Today's Purchase Cost */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(0,0,0,0.15)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Today's Purchase Cost
              </p>
              <p
                className="text-lg font-800"
                style={{ color: "#93c5fd", fontWeight: 800 }}
              >
                {fmtCurrency(inventory.todayPurchaseCost)}
              </p>
            </div>

            {/* Bottom Right: Today's Purchases */}
            <div
              className="rounded-xl p-2.5"
              style={{ background: "rgba(0,0,0,0.15)" }}
            >
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>
                Today's Purchases
              </p>
              <p
                className="text-lg font-800"
                style={{ color: "white", fontWeight: 800 }}
              >
                {inventory.todayPurchasesCount}{" "}
                {inventory.todayPurchasesCount === 1 ? "purchase" : "purchases"}
              </p>
            </div>
          </div>
        </button>

        {/* ── Recent Customers Section ── */}
        {recentCustomersList.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-700 uppercase tracking-wider text-gray-500">
                Recent Customers
              </p>
              <span className="text-xs text-gray-400 font-600">
                {recentCustomersList.length} recent
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {recentCustomersList.map((cust) => {
                const routeName =
                  (routeNames && routeNames[cust.routeId]) || cust.routeId
                const hasCredit = cust.outstandingCredit > 0
                return (
                  <button
                    key={cust.id}
                    onClick={() =>
                      navigate("transaction", cust.routeId, cust.id)
                    }
                    className="w-full rounded-2xl p-3.5 flex items-center justify-between active:scale-98 transition-transform text-left border shadow-sm"
                    style={{ background: "#f9fafb", borderColor: "#e5e7eb" }}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-800 truncate"
                          style={{ fontWeight: 800, color: "#111827" }}
                        >
                          {cust.name}
                        </p>
                        {cust.subtitle && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-600 truncate bg-gray-200 text-gray-700">
                            {cust.subtitle}
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 text-gray-500 font-600">
                        {routeName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-500 text-gray-400">Credit</p>
                        <p
                          className="text-xs font-800"
                          style={{
                            fontWeight: 800,
                            color: hasCredit ? "#dc2626" : "#059669",
                          }}
                        >
                          {fmtCurrency(cust.outstandingCredit)}
                        </p>
                      </div>
                      <IconChevronRight />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Dynamic Route Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-700 uppercase tracking-wider text-gray-500">
              Delivery Routes
            </p>
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="flex items-center gap-1 text-xs font-700 text-emerald-600 px-2.5 py-1 rounded-full bg-emerald-50 active:scale-95 transition-transform"
            >
              <IconPlus />
              <span>Add Route</span>
            </button>
          </div>

          <SearchBar
            value={routeSearchQuery}
            onChange={setRouteSearchQuery}
            placeholder="Search route name..."
          />

          {filteredRoutes.length === 0 ? (
            <div className="p-4 rounded-2xl border text-center text-xs text-gray-500 bg-gray-50">
              {routeSearchQuery.trim()
                ? `No routes found matching "${routeSearchQuery}"`
                : 'No routes available. Tap "+ Add Route" to create one.'}
            </div>
          ) : (
            filteredRoutes.map((r, idx) => {
              const custCount = Object.values(customers || {}).filter(
                (c) => c.routeId === r.id,
              ).length
              const gradients = [
                "linear-gradient(135deg, #059669 0%, #047857 100%)",
                "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
              ]
              const bg = gradients[idx % gradients.length]

              return (
                <button
                  key={r.id}
                  onClick={() => navigate("route", r.id)}
                  className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-98 transition-transform text-left shadow-sm"
                  style={{ background: bg, minHeight: "90px" }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  >
                    <div style={{ color: "white" }}>
                      <IconRoute />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xl font-800 truncate"
                      style={{ color: "white", fontWeight: 800 }}
                    >
                      {r.name}
                    </p>
                    <p
                      className="text-sm mt-0.5 truncate"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    >
                      {custCount} {custCount === 1 ? "customer" : "customers"} ·
                      Start deliveries
                    </p>
                  </div>
                  <IconChevronRight />
                </button>
              )
            })
          )}
        </div>

        {/* Expenses Button */}
        <button
          onClick={() => navigate("expenses")}
          className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-98 transition-transform border text-left bg-white shadow-xs"
          style={{ borderColor: "#e5e7eb" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700">
            <IconWallet />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-gray-900">
              Record Expense
            </p>
            <p className="text-xs text-gray-500 font-medium">
              Log daily shop expenses, rent & fuel
            </p>
          </div>
          <IconChevronRight />
        </button>

        {/* Sales Register Button */}
        <button
          onClick={() => navigate("history")}
          className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-98 transition-transform border text-left bg-white shadow-xs"
          style={{ borderColor: "#e5e7eb" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
            <IconHistory />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-gray-900">
              Sales Register
            </p>
            <p className="text-xs text-gray-500 font-medium">
              View all daily sales & payment logs
            </p>
          </div>
          <IconChevronRight />
        </button>
      </div>

      {/* Add Route Modal */}
      {showAddRouteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl"
            style={{ border: "1.5px solid #e5e7eb" }}
          >
            <h3
              className="text-lg font-800"
              style={{ fontWeight: 800, color: "#111827" }}
            >
              Add New Route
            </h3>
            <div>
              <label className="text-xs font-700 text-gray-600 mb-1 block">
                Route Name
              </label>
              <input
                type="text"
                placeholder="e.g. North Route, Main Market"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border outline-none focus:border-emerald-500 font-600"
                style={{ borderColor: "#e5e7eb", color: "#111827" }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowAddRouteModal(false)}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-gray-600 bg-gray-100 active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoute}
                disabled={!newRouteName.trim()}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-white bg-emerald-600 active:scale-95 transition-transform disabled:opacity-50"
              >
                Create Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
