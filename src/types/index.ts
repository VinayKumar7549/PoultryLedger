export type Screen =
  | 'home'
  | 'route'
  | 'transaction'
  | 'history'
  | 'credit'
  | 'expenses'
  | 'expenseHistory'
  | 'inventory'

export type PaymentMethod = 'cash' | 'gpay'

export type EggType = 'normal' | 'damaged'

export interface Transaction {
  id: string
  customerId: string
  date: string
  time: string
  trays: number
  amountToBePaid: number
  amountPaid: number
  paymentMethod: PaymentMethod
  creditKeptToday: number
  creditChange: number
}

export interface Customer {
  id: string
  name: string
  subtitle: string
  routeId: string
  outstandingCredit: number
  transactions: Transaction[]
}

export interface Expense {
  id: string
  date: string
  time: string
  amount: number
  purpose: string
  paymentMethod: PaymentMethod
}

export interface EggPurchase {
  id: string
  date: string
  time: string
  trays: number
  totalEggs: number
  eggType: EggType
  ratePer100: number
  totalAmount: number
}
