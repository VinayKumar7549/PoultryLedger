import { useState } from 'react'
import { Screen, Customer, Expense, EggPurchase, Transaction } from './types'
import { today } from './utils/date'
import {
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_PURCHASES,
  INITIAL_ROUTE_CUSTOMERS,
} from './data/seedData'
import { StatusBar } from './components/common/StatusBar'
import { SideMenu } from './components/layout/SideMenu'
import { HomeScreen } from './pages/HomeScreen'
import { RouteScreen } from './pages/RouteScreen'
import { TransactionScreen } from './pages/TransactionScreen'
import { HistoryScreen } from './pages/HistoryScreen'
import { CreditRecordsScreen } from './pages/CreditRecordsScreen'
import { AddExpenseScreen } from './pages/AddExpenseScreen'
import { ExpenseHistoryScreen } from './pages/ExpenseHistoryScreen'
import { InventoryScreen } from './pages/InventoryScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedRouteId, setSelectedRouteId] = useState<string>('r1')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c1')
  const [customers, setCustomers] = useState<Record<string, Customer>>(INITIAL_CUSTOMERS)
  const [routeCustomerMap, setRouteCustomerMap] = useState<Record<string, string[]>>(INITIAL_ROUTE_CUSTOMERS)
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES)
  const [purchases, setPurchases] = useState<EggPurchase[]>(INITIAL_PURCHASES)
  const [historyDate, setHistoryDate] = useState<string>(today)
  const [expenseDate, setExpenseDate] = useState<string>(today)
  const [showMenu, setShowMenu] = useState<boolean>(false)

  const navigate = (s: Screen, rId?: string, cId?: string) => {
    setScreen(s)
    if (rId) setSelectedRouteId(rId)
    if (cId) setSelectedCustomerId(cId)
  }

  const handleSaveTransaction = (tx: Transaction, updatedOutstanding: number) => {
    setCustomers(prev => ({
      ...prev,
      [tx.customerId]: {
        ...prev[tx.customerId],
        outstandingCredit: updatedOutstanding,
        transactions: [...prev[tx.customerId].transactions, tx],
      },
    }))
  }

  const handleSaveRouteCustomers = (rId: string, ids: string[]) => {
    setRouteCustomerMap(prev => ({ ...prev, [rId]: ids }))
  }

  const handleSaveExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev])
  }

  const handleSavePurchase = (p: EggPurchase) => {
    setPurchases(prev => [p, ...prev])
  }

  const handleUpdatePurchase = (p: EggPurchase) => {
    setPurchases(prev => prev.map(item => item.id === p.id ? p : item))
  }

  const handleDeletePurchase = (id: string) => {
    setPurchases(prev => prev.filter(item => item.id !== id))
  }

  const selectedCustomer = customers[selectedCustomerId]

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#e8f5e9', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Outer phone frame / shadow */}
      <div
        style={{
          width: '390px',
          height: '844px',
          borderRadius: '48px',
          background: '#1a1a2e',
          padding: '10px',
          boxShadow: '0 32px 80px rgba(5,150,105,0.25), 0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Screen container */}
        <div
          style={{
            flex: 1,
            borderRadius: '40px',
            overflow: 'hidden',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <StatusBar />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              }}
            >
              {screen === 'home' && (
                <HomeScreen
                  customers={customers}
                  expenses={expenses}
                  purchases={purchases}
                  navigate={(s, r) => navigate(s, r)}
                />
              )}
              {screen === 'route' && (
                <RouteScreen
                  routeId={selectedRouteId}
                  customers={customers}
                  routeCustomers={routeCustomerMap[selectedRouteId] || []}
                  navigate={navigate}
                  onBack={() => setScreen('home')}
                  onSaveRouteCustomers={handleSaveRouteCustomers}
                />
              )}
              {screen === 'transaction' && selectedCustomer && (
                <TransactionScreen
                  customer={selectedCustomer}
                  onBack={() => setScreen('route')}
                  onSave={handleSaveTransaction}
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
                  onBack={() => setScreen('home')}
                  onSavePurchase={handleSavePurchase}
                  onUpdatePurchase={handleUpdatePurchase}
                  onDeletePurchase={handleDeletePurchase}
                />
              )}

              {/* Side Menu */}
              <SideMenu
                visible={showMenu}
                onClose={() => setShowMenu(false)}
                onNavigate={(s) => navigate(s)}
                currentScreen={screen}
              />
            </div>
          </div>

          {/* Home indicator bar */}
          <div className="flex justify-center pb-2 pt-1" style={{ background: 'white' }}>
            <div style={{ width: '120px', height: '5px', borderRadius: '3px', background: '#d1d5db' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
