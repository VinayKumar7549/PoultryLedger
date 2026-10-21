import { useState, useEffect, useRef } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Screen, Customer, Expense, EggPurchase, Transaction, BusinessProfile } from './types'
import { getTodayStr } from './utils/date'
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
import { ErrorBoundary } from './components/common/ErrorBoundary'

export interface StackEntry {
  screen: Screen
  routeId?: string
  customerId?: string
}

export default function App() {
  const [navStack, setNavStack] = useState<StackEntry[]>([{ screen: 'home' }])
  const navStackRef = useRef<StackEntry[]>([{ screen: 'home' }])

  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customers, setCustomers] = useState<Record<string, Customer>>({})
  const [routeCustomerMap, setRouteCustomerMap] = useState<Record<string, string[]>>({})
  const [routes, setRoutes] = useState<RouteEntity[]>([])
  const [routeNames, setRouteNames] = useState<Record<string, string>>({})
  const [recentCustomerIds, setRecentCustomerIds] = useState<string[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [purchases, setPurchases] = useState<EggPurchase[]>([])
  const [historyDate, setHistoryDate] = useState<string>(() => getTodayStr())
  const [expenseDate, setExpenseDate] = useState<string>(() => getTodayStr())
  const [showMenu, setShowMenu] = useState<boolean>(false)
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [backupReminder, setBackupReminder] = useState<{ show: boolean; days: number }>({ show: false, days: 0 })

  useEffect(() => {
    navStackRef.current = navStack
  }, [navStack])

  const currentStackEntry = navStack[navStack.length - 1] || { screen: 'home' }
  const screen = currentStackEntry.screen

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

  const pushNavigate = (s: Screen, rId?: string, cId?: string) => {
    if (s === 'home') {
      const homeStack: StackEntry[] = [{ screen: 'home' }]
      navStackRef.current = homeStack
      setNavStack(homeStack)
      return
    }

    const targetRouteId = rId !== undefined ? rId : selectedRouteId
    const targetCustomerId = cId !== undefined ? cId : selectedCustomerId

    if (cId) {
      recentCustomersService.addRecentCustomer(cId).then(setRecentCustomerIds)
    }

    const currentTop = navStackRef.current[navStackRef.current.length - 1]
    if (
      currentTop &&
      currentTop.screen === s &&
      currentTop.routeId === targetRouteId &&
      currentTop.customerId === targetCustomerId
    ) {
      return
    }

    const entry: StackEntry = { screen: s, routeId: targetRouteId, customerId: targetCustomerId }
    const newStack = [...navStackRef.current, entry]
    navStackRef.current = newStack
    setNavStack(newStack)

    if (targetRouteId) setSelectedRouteId(targetRouteId)
    if (targetCustomerId) setSelectedCustomerId(targetCustomerId)
  }

  const goBack = () => {
    if (navStackRef.current.length > 1) {
      const newStack = navStackRef.current.slice(0, -1)
      navStackRef.current = newStack
      setNavStack(newStack)

      const prev = newStack[newStack.length - 1]
      if (prev.routeId !== undefined) setSelectedRouteId(prev.routeId)
      if (prev.customerId !== undefined) setSelectedCustomerId(prev.customerId)

      if (prev.screen !== 'transaction') {
        setEditingTransaction(undefined)
      }
    } else {
      CapacitorApp.exitApp()
    }
  }

  useEffect(() => {
    let backListener: any = null

    const setupBackButton = async () => {
      try {
        backListener = await CapacitorApp.addListener('backButton', () => {
          if (showMenu) {
            setShowMenu(false)
            return
          }

          if (navStackRef.current.length > 1) {
            goBack()
          } else {
            CapacitorApp.exitApp()
          }
        })
      } catch (_) {
        // Hardware back button listener unavailable (e.g. running in web browser)
      }
    }

    setupBackButton()

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove()
      }
    }
  }, [showMenu])

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
    pushNavigate(s, rId, cId)
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

  const handleDeleteRoute = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await routeService.deleteRoute(id)
    if (!res.success) {
      return { success: false, error: res.error }
    }
    setRoutes(res.routes)
    setRouteNames(res.routeNames)
    const custRes = await customerService.fetchCustomersAndRoutes()
    setCustomers(custRes.customers)
    setRouteCustomerMap(custRes.routeCustomerMap)
    pushNavigate('home')
    return { success: true }
  }

  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)

  const handleSaveTransaction = async (tx: Transaction, updatedOutstanding: number) => {
    if (editingTransaction) {
      await transactionService.updateTransaction(tx, updatedOutstanding)
      setEditingTransaction(undefined)
    } else {
      await transactionService.createTransaction(tx, updatedOutstanding)
    }
    const res = await customerService.fetchCustomersAndRoutes()
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx)
    setSelectedCustomerId(tx.customerId)
    pushNavigate('transaction', selectedRouteId, tx.customerId)
  }

  const handleDeleteTransaction = async (id: string, customerId: string) => {
    await transactionService.deleteTransaction(id, customerId)
    const res = await customerService.fetchCustomersAndRoutes()
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleSaveRouteCustomers = async (rId: string, ids: string[]) => {
    const res = await customerService.saveRouteCustomers(rId, ids)
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
  }

  const handleDeleteCustomer = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await customerService.deleteCustomer(id)
    if (!res.success) {
      return { success: false, error: res.error }
    }
    setCustomers(res.customers)
    setRouteCustomerMap(res.routeCustomerMap)
    return { success: true }
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

  const handleUpdateExpense = async (expense: Expense) => {
    const updated = await expenseService.updateExpense(expense)
    setExpenses(updated)
  }

  const handleDeleteExpense = async (id: string) => {
    const updated = await expenseService.deleteExpense(id)
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
          <ErrorBoundary key={screen} onReset={() => pushNavigate('home')}>
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
                onMenuOpen={() => setShowMenu(true)}
                businessProfile={businessProfile}
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
                onBack={goBack}
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
                editingTx={editingTransaction}
                onBack={goBack}
                onSave={handleSaveTransaction}
                onOpenLedger={() => navigate('customer_history', selectedRouteId, selectedCustomer.id)}
              />
            )}
            {screen === 'customer_history' && (
              <CustomerHistoryScreen
                customerId={selectedCustomerId}
                routeId={selectedRouteId}
                customers={customers}
                routes={routes}
                routeNames={routeNames}
                onBack={goBack}
                onUpdateCustomer={handleUpdateCustomer}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onNavigate={(s) => pushNavigate(s)}
              />
            )}
            {screen === 'history' && (
              <HistoryScreen
                customers={customers}
                historyDate={historyDate}
                setHistoryDate={setHistoryDate}
                onMenuOpen={() => setShowMenu(true)}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
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
                selectedDate={expenseDate}
                onBack={goBack}
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
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
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
          </ErrorBoundary>

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
