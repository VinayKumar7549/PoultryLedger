
export type TransactionCategory =
  | 'normal_sale'       // 🟢 Green: Normal Sale (paid exact bill amount)
  | 'payment_only'      // 🔵 Blue: Payment Only
  | 'credit_added_sale' // 🔴 Red: Sale where customer kept credit
  | 'credit_paid_sale'  // 🟣 Purple: Sale where customer bought eggs AND paid previous credit
  | 'opening_balance'   // ⚪ Grey: Opening Balance

export interface TransactionLike {
  type?: 'sale' | 'payment' | 'opening' | string
  amountToBePaid?: number
  amountPaid?: number
  creditKeptToday?: number
  creditChange?: number
  trays?: number
}

/**
 * Classifies a transaction into one of 5 distinct categories based on user requirements.
 */
export function getTransactionCategory(tx: TransactionLike): TransactionCategory {
  if (tx.type === 'opening') {
    return 'opening_balance'
  }

  const billed = Number(tx.amountToBePaid) || 0
  const paid = Number(tx.amountPaid) || 0
  const type = tx.type || (billed > 0 ? 'sale' : 'payment')

  if (type === 'payment' || (billed === 0 && paid > 0)) {
    return 'payment_only'
  }

  // Transaction is a Sale (billed > 0)
  if (paid < billed) {
    return 'credit_added_sale' // Outstanding credit increased -> RED
  } else if (paid > billed) {
    return 'credit_paid_sale'  // Bought eggs + paid previous credit -> PURPLE
  } else {
    return 'normal_sale'       // Paid exact bill amount -> GREEN
  }
}

/**
 * Formats any payment method to either '💵 Cash' or '🌐 Online'
 */
export function formatPaymentMethod(method?: string): string {
  if (!method) return '💵 Cash'
  const m = method.toLowerCase().trim()
  if (m === 'cash') {
    return '💵 Cash'
  }
  return '🌐 Online'
}

export { formatPaymentMethodText } from '../../utils/format'

export interface CategoryStyle {
  label: string
  shortLabel: string
  dotClass: string
  badgeClass: string
  textClass: string
  bgLight: string
  borderColor: string
  hexColor: string
}

export const TRANSACTION_CATEGORY_STYLES: Record<TransactionCategory, CategoryStyle> = {
  normal_sale: {
    label: '🛒 Sale',
    shortLabel: 'Sale',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-emerald-700',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
    hexColor: '#059669',
  },
  payment_only: {
    label: '💳 Payment Received',
    shortLabel: 'Payment',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    textClass: 'text-blue-700',
    bgLight: '#eff6ff',
    borderColor: '#bfdbfe',
    hexColor: '#2563eb',
  },
  credit_added_sale: {
    label: '🛒 Credit Added',
    shortLabel: 'Credit Added',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    textClass: 'text-red-700',
    bgLight: '#fef2f2',
    borderColor: '#fecaca',
    hexColor: '#dc2626',
  },
  credit_paid_sale: {
    label: '🛒 Sale + Payment',
    shortLabel: 'Sale + Payment',
    dotClass: 'bg-purple-600',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    textClass: 'text-purple-700',
    bgLight: '#faf5ff',
    borderColor: '#e9d5ff',
    hexColor: '#9333ea',
  },
  opening_balance: {
    label: '🏁 Opening Balance',
    shortLabel: 'Opening Balance',
    dotClass: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    textClass: 'text-slate-700',
    bgLight: '#f8fafc',
    borderColor: '#e2e8f0',
    hexColor: '#64748b',
  },
}

/**
 * Component for displaying Payment Method Badge ('💵 Cash' or '🌐 Online').
 * Only displays if amountPaid > 0 (money was actually received).
 */
export function PaymentMethodBadge({
  method,
  amountPaid,
  tx,
  className = '',
}: {
  method?: string
  amountPaid?: number
  tx?: TransactionLike
  className?: string
}) {
  const paid = amountPaid !== undefined ? amountPaid : (tx ? Number(tx.amountPaid) || 0 : undefined)

  if (paid !== undefined && paid <= 0) {
    return null
  }

  const formatted = formatPaymentMethod(method)
  const isCash = formatted.includes('Cash')

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
        isCash
          ? 'bg-slate-100 text-slate-700 border-slate-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      } ${className}`}
    >
      {formatted}
    </span>
  )
}

/**
 * Component for rendering the transaction category badge (Green, Blue, Red, Purple, Grey)
 */
export function TransactionBadge({
  tx,
  category: customCategory,
  useShortLabel = false,
  className = '',
}: {
  tx?: TransactionLike
  category?: TransactionCategory
  useShortLabel?: boolean
  className?: string
}) {
  const category = customCategory || (tx ? getTransactionCategory(tx) : 'normal_sale')
  const style = TRANSACTION_CATEGORY_STYLES[category]
  const displayLabel = useShortLabel ? style.shortLabel : style.label

  return (
    <span
      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${style.badgeClass} ${className}`}
    >
      {displayLabel}
    </span>
  )
}

/**
 * Component for rendering timeline node dots in corresponding category color
 */
export function TransactionDot({
  tx,
  category: customCategory,
  className = '',
}: {
  tx?: TransactionLike
  category?: TransactionCategory
  className?: string
}) {
  const category = customCategory || (tx ? getTransactionCategory(tx) : 'normal_sale')
  const style = TRANSACTION_CATEGORY_STYLES[category]

  return (
    <div
      className={`w-3.5 h-3.5 rounded-full border-2 border-white ${style.dotClass} shadow-2xs ${className}`}
    />
  )
}
