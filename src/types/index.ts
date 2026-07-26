export type Screen =
  | 'home'
  | 'route'
  | 'transaction'
  | 'history'
  | 'customer_history'
  | 'credit'
  | 'expenses'
  | 'expenseHistory'
  | 'inventory'
  | 'reports'
  | 'backup'
  | 'profile'

export type PaymentMethod = 'cash' | 'gpay'

export type EggType = 'normal' | 'damaged'

export type TransactionType = 'sale' | 'payment'

export interface Transaction {
  id: string
  customerId: string
  type?: TransactionType
  date: string
  time: string
  trays: number
  amountToBePaid: number
  amountPaid: number
  paymentMethod: PaymentMethod
  creditKeptToday: number
  creditChange: number
  notes?: string
}

export interface Customer {
  id: string
  name: string
  subtitle: string
  routeId: string
  openingCredit: number
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

export interface BusinessProfile {
  businessName: string
  ownerName?: string
  phoneNumber?: string
  address?: string
  businessLogo?: string
  configured: boolean
}
