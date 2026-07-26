import { useState, useEffect } from 'react'
import { Screen, Customer, Expense, EggPurchase, Transaction, BusinessProfile } from './types'
import { today } from './utils/date'
import { dbInstance } from './database/database'
import { customerService } from './services/customerService'
import { routeService } from './services/routeService'
import { purchaseService } from './services/purchaseService'
import { transactionService } from './services/transactionService'
import { expenseService } from './services/expenseService'
import { businessProfileService } from './services/businessProfileService'
import { backupService } from './services/backupService'
import { SideMenu } from './components/layout/SideMenu'
import { HomeScreen } from './pages/HomeScreen'
import { RouteScreen } from './pages/RouteScreen'
import { TransactionScreen } from './pages/TransactionScreen'
import { HistoryScreen } from './pages/HistoryScreen'
import { CreditRecordsScreen } from './pages/CreditRecordsScreen'
import { AddExpenseScreen } from './pages/AddExpenseScreen'
import { ExpenseHistoryScreen } from './pages/ExpenseHistoryScreen'
import { InventoryScreen } from './pages/InventoryScreen'
import { ReportsScreen } from './pages/ReportsScreen'
import { BackupRestoreScreen } from './pages/BackupRestoreScreen'
import { BusinessProfileScreen } from './pages/BusinessProfileScreen'
import { CustomerHistoryScreen } from './pages/CustomerHistoryScreen'
import { BusinessProfileSetupModal } from './components/common/BusinessProfileSetupModal'

import { RouteEntity } from './database'
import { recentCustomersService } from './services/recentCustomersService'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [routeCustomerMap, setRouteCustomerMap] = useState<Record<string, string[]>>({})
  const [routes, setRoutes] = useState<RouteEntity[]>([])
  const [routeNames, setRouteNames] = useState<Record<string, string>>({})
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [purchases, setPurchases] = useState<EggPurchase[]>([])
  const [historyDate, setHistoryDate] = useState<string>(today)
  const [expenseDate, setExpenseDate] = useState<string>(today)
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [backupReminder, setBackupReminder] = useState<{ show: boolean; days: number }>({ show: false, days: 0 })

  const loadAppData = async () => {
    await dbInstance.initDatabase()

    const prof = await businessProfileService.getProfile()
    setBusinessProfile(prof)

    const routesRes = await routeService.loadRoutes()
    setRoutes(routesRes.routes)
    setRouteNames(routesRes.routeNames)
    if (routesRes.routes.length > 0) {
      setSelectedRouteId(routesRes.routes[0].id)
    }

    const custRes = await customerService.fetchCustomersAndRoutes()
    setCustomers(custRes.customers)
    setRouteCustomerMap(custRes.routeCustomerMap)

    const purchasesRes = await purchaseService.getAllPurchases()
    setPurchases(purchasesRes)

    const expensesRes = await expenseService.getAllExpenses()
    setExpenses(expensesRes)

    const recentRes = await recentCustomersService.getRecentCustomerIds()
    setRecentCustomerIds(recentRes)
  }

  useEffect(() => {
    const initApp = async () => {
      await dbInstance.initDatabase()

      // Check Business Profile Configuration on First Launch
      const isConfigured = await businessProfileService.isProfileConfigured()
      if (!isConfigured) {
        setShowSetupModal(true)
      } else {
        await loadAppData()
      }

      // Check Backup Health
      try {
        const health = await backupService.getBackupHealth()
        if (health.needsReminder) {
          setBackupReminder({ show: true, days: health.daysSinceLastBackup })
        }
      } catch (_) {
        // Silently ignore if backup health check fails
      }
    }

    initApp()
  }, [])

  const handleSaveInitialProfile = async (profileData: Partial<BusinessProfile>) => {
    const updated = await businessProfileService.saveProfile(profileData)
    setBusinessProfile(updated)
    setShowSetupModal(false)
    await loadAppData()
  }

  const handleRestoreSuccessFromSetup = async () => {
    setShowSetupModal(false)
    await loadAppData()
  }

  const navigate = (s: Screen, rId?: string, cId?: string) => {
    setScreen(s)
    if (rId) setSelectedRouteId(rId)
    if (cId) {
      setSelectedCustomerId(cId)
      recentCustomersService.addRecentCustomer(cId).then(setRecentCustomerIds)
    }
  }

  const handleCreateRoute = async (name: string) => {
    const res = await routeService.createRoute(name)
    setRoutes(res.routes)
    setRouteNames(res.routeNames)
  }

  const handleRenameRoute = async (id: string, newName: string) => {
    const res = await routeService.updateRoute(id, newName)
    setRoutes(res.routes)
    setRouteNames(res.routeNames)
  }

  const handleDeleteRoute = async (id: string) => {
    const res = await routeService.deleteRoute(id)
    setRoutes(res.routes)
    setRouteNames(res.routeNames)
    const custRes = await customerService.fetchCustomersAndRoutes()
    setCustomers(custRes.customers)
    setRouteCustomerMap(custRes.routeCustomerMap)
    setScreen('home')
  }

  const handleSaveTransaction = async (tx: Transaction, updatedOutstanding: number) => {
    await transactionService.createTransaction(tx, updatedOutstanding)
    const res = await customerService.fetchCustomersAndRoutes()
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleSaveRouteCustomers = async (rId: string, ids: string[]) => {
    const res = await customerService.saveRouteCustomers(rId, ids)
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleDeleteCustomer = async (id: string) => {
    const res = await customerService.deleteCustomer(id)
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleCreateCustomer = async (name: string, subtitle: string, routeId: string, openingCredit?: number) => {
    const res = await customerService.createCustomer({ name, subtitle, routeId, openingCredit })
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleUpdateCustomer = async (id: string, name: string, subtitle: string, routeId: string, openingCredit?: number) => {
    const res = await customerService.updateCustomer(id, { name, subtitle, routeId, openingCredit })
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleSaveExpense = async (expense: Expense) => {
    const updated = await expenseService.createExpense(expense)
    setExpenses(updated)
  }

  const handleSavePurchase = async (p: EggPurchase) => {
    const updated = await purchaseService.createPurchase(p)
    setPurchases(updated)
  }

  const handleUpdatePurchase = async (p: EggPurchase) => {
    const updated = await purchaseService.updatePurchase(p)
    setPurchases(updated)
  }

  const handleDeletePurchase = async (id: string) => {
    const updated = await purchaseService.deletePurchase(id)
    setPurchases(updated)
  }

  const selectedCustomer = customers[selectedCustomerId]

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          {screen === 'home' && (
            <HomeScreen
              customers={customers}
              expenses={expenses}
              purchases={purchases}
              routes={routes}
              routeNames={routeNames}
              recentCustomerIds={recentCustomerIds}
              navigate={(s, r, c) => navigate(s, r, c)}
              onCreateRoute={handleCreateRoute}
            />
          )}
          {screen === 'route' && (
            <RouteScreen
              routeId={selectedRouteId}
              customers={customers}
              routeCustomers={routeCustomerMap[selectedRouteId] || []}
              routes={routes}
              routeNames={routeNames}
              navigate={navigate}
              onBack={() => setScreen('home')}
              onSaveRouteCustomers={handleSaveRouteCustomers}
              onDeleteCustomer={handleDeleteCustomer}
              onCreateCustomer={handleCreateCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onCreateRoute={handleCreateRoute}
              onRenameRoute={handleRenameRoute}
              onDeleteRoute={handleDeleteRoute}
            />
          )}
          {screen === 'transaction' && selectedCustomer && (
            <TransactionScreen
              customer={selectedCustomer}
              onBack={() => setScreen('route')}
              onSave={handleSaveTransaction}
            />
          )}
          {screen === 'customer_history' && (
            <CustomerHistoryScreen
              customerId={selectedCustomerId}
              routeId={selectedRouteId}
              customers={customers}
              routes={routes}
              routeNames={routeNames}
              onBack={() => setScreen('route')}
              onUpdateCustomer={handleUpdateCustomer}
            />
          )}
          {screen === 'history' && (
            <HistoryScreen
              customers={customers}
              historyDate={historyDate}
              setHistoryDate={setHistoryDate}
              onMenuOpen={() => setShowMenu(true)}
            />
          )}
          {screen === 'credit' && (
            <CreditRecordsScreen
              customers={customers}
              routeCustomerMap={routeCustomerMap}
              onMenuOpen={() => setShowMenu(true)}
              routeNames={routeNames}
            />
          )}
          {screen === 'expenses' && (
            <AddExpenseScreen
              onBack={() => setScreen('home')}
              onSaveExpense={handleSaveExpense}
            />
          )}
          {screen === 'expenseHistory' && (
            <ExpenseHistoryScreen
              expenses={expenses}
              expenseDate={expenseDate}
              setExpenseDate={setExpenseDate}
              onMenuOpen={() => setShowMenu(true)}
              onAddExpense={() => navigate('expenses')}
            />
          )}
          {screen === 'inventory' && (
            <InventoryScreen
              customers={customers}
              purchases={purchases}
              onMenuOpen={() => setShowMenu(true)}
              onSavePurchase={handleSavePurchase}
              onUpdatePurchase={handleUpdatePurchase}
              onDeletePurchase={handleDeletePurchase}
            />
          )}
          {screen === 'reports' && (
            <ReportsScreen
              customers={customers}
              expenses={expenses}
              purchases={purchases}
              onMenuOpen={() => setShowMenu(true)}
              routeNames={routeNames}
            />
          )}

          {screen === 'backup' && (
            <BackupRestoreScreen
              onMenuOpen={() => setShowMenu(true)}
            />
          )}
          {screen === 'profile' && (
            <BusinessProfileScreen
              onMenuOpen={() => setShowMenu(true)}
              onProfileUpdated={prof => setBusinessProfile(prof)}
            />
          )}

          {/* Side Menu */}
          <SideMenu
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            onNavigate={(s) => navigate(s)}
            currentScreen={screen}
          />

          {/* First-Launch Setup Modal */}
          {showSetupModal && (
            <BusinessProfileSetupModal
              onSave={handleSaveInitialProfile}
              onRestoreSuccess={handleRestoreSuccessFromSetup}
            />
          )}

          {/* Backup Reminder Banner */}
          {backupReminder.show && (
            <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-2">
              <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-amber-300 bg-amber-50">
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">
                    ⚠ Backup Reminder
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    It's been {backupReminder.days} days since your last backup. Consider backing up your data.
                  </p>
                </div>
                <button
                  onClick={() => setBackupReminder({ show: false, days: 0 })}
                  className="text-amber-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-amber-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
