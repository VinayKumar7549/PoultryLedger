import { Customer, Expense, EggPurchase } from '../types'
import { today, yesterday, twoDaysAgo, getPrevMonthStr } from '../utils/date'

const lastMonthStr = getPrevMonthStr(today.slice(0, 7))
const lastMonthSampleDate = `${lastMonthStr}-20`

export const INITIAL_PURCHASES: EggPurchase[] = [
  { id: 'p1', date: today, time: '06:30 AM', trays: 40, totalEggs: 1200, eggType: 'normal', ratePer100: 210, totalAmount: 2520 },
  { id: 'p2', date: today, time: '07:15 AM', trays: 2, totalEggs: 60, eggType: 'damaged', ratePer100: 180, totalAmount: 108 },
  { id: 'p3', date: yesterday, time: '06:15 AM', trays: 50, totalEggs: 1500, eggType: 'normal', ratePer100: 205, totalAmount: 3075 },
  { id: 'p4', date: lastMonthSampleDate, time: '06:00 AM', trays: 60, totalEggs: 1800, eggType: 'normal', ratePer100: 200, totalAmount: 3600 },
]

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', date: today, time: '08:30 AM', amount: 350, purpose: 'Vehicle Fuel (Petrol)', paymentMethod: 'cash' },
  { id: 'e2', date: yesterday, time: '02:15 PM', amount: 180, purpose: 'Egg Carton Boxes & Packaging', paymentMethod: 'gpay' },
  { id: 'e3', date: twoDaysAgo, time: '11:45 AM', amount: 60, purpose: 'Tea & Snacks for Staff', paymentMethod: 'cash' },
  { id: 'e4', date: lastMonthSampleDate, time: '10:00 AM', amount: 300, purpose: 'Monthly Vehicle Maintenance', paymentMethod: 'cash' },
]

export const INITIAL_CUSTOMERS: Record<string, Customer> = {
  c1: {
    id: 'c1', name: 'Alice Fernando', subtitle: 'Shop Owner', routeId: 'r1',
    outstandingCredit: 450,
    transactions: [
      { id: 't1a', customerId: 'c1', date: twoDaysAgo, time: '09:15 AM', trays: 50, amountToBePaid: 500, amountPaid: 500, paymentMethod: 'cash', creditKeptToday: 0, creditChange: 0 },
      { id: 't1b', customerId: 'c1', date: yesterday, time: '09:10 AM', trays: 40, amountToBePaid: 400, amountPaid: 0, paymentMethod: 'cash', creditKeptToday: 400, creditChange: -400 },
      { id: 't1c', customerId: 'c1', date: today, time: '08:55 AM', trays: 50, amountToBePaid: 500, amountPaid: 550, paymentMethod: 'cash', creditKeptToday: 0, creditChange: 50 },
    ],
  },
  c2: {
    id: 'c2', name: 'Raj Patel', subtitle: 'Hotel & Restaurant', routeId: 'r1',
    outstandingCredit: 0,
    transactions: [
      { id: 't2a', customerId: 'c2', date: yesterday, time: '10:05 AM', trays: 100, amountToBePaid: 1000, amountPaid: 1000, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
      { id: 't2b', customerId: 'c2', date: today, time: '09:40 AM', trays: 120, amountToBePaid: 1200, amountPaid: 1200, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
    ],
  },
  c3: {
    id: 'c3', name: 'Meera Nair', subtitle: 'Office Canteen', routeId: 'r1',
    outstandingCredit: 150,
    transactions: [
      { id: 't3a', customerId: 'c3', date: twoDaysAgo, time: '11:00 AM', trays: 30, amountToBePaid: 300, amountPaid: 150, paymentMethod: 'cash', creditKeptToday: 150, creditChange: -150 },
    ],
  },
  c4: {
    id: 'c4', name: 'Joseph Thomas', subtitle: 'Sunrise Bakery', routeId: 'r1',
    outstandingCredit: 800,
    transactions: [
      { id: 't4a', customerId: 'c4', date: yesterday, time: '11:30 AM', trays: 80, amountToBePaid: 800, amountPaid: 400, paymentMethod: 'cash', creditKeptToday: 400, creditChange: -400 },
      { id: 't4b', customerId: 'c4', date: today, time: '10:55 AM', trays: 80, amountToBePaid: 800, amountPaid: 800, paymentMethod: 'cash', creditKeptToday: 0, creditChange: 0 },
    ],
  },
  c5: {
    id: 'c5', name: 'Sunita Devi', subtitle: 'Mess & Tiffin', routeId: 'r1',
    outstandingCredit: 0,
    transactions: [
      { id: 't5a', customerId: 'c5', date: today, time: '11:20 AM', trays: 60, amountToBePaid: 600, amountPaid: 600, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
    ],
  },
  c6: {
    id: 'c6', name: 'Priya Sharma', subtitle: 'Family Restaurant', routeId: 'r2',
    outstandingCredit: 250,
    transactions: [
      { id: 't6a', customerId: 'c6', date: yesterday, time: '01:15 PM', trays: 5, amountToBePaid: 500, amountPaid: 250, paymentMethod: 'cash', creditKeptToday: 250, creditChange: -250 },
    ],
  },
  c7: {
    id: 'c7', name: 'David Kumar', subtitle: 'Brew & Bite Café', routeId: 'r2',
    outstandingCredit: 0,
    transactions: [
      { id: 't7a', customerId: 'c7', date: yesterday, time: '02:15 PM', trays: 4, amountToBePaid: 400, amountPaid: 400, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
      { id: 't7b', customerId: 'c7', date: today, time: '01:30 PM', trays: 4, amountToBePaid: 400, amountPaid: 400, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
    ],
  },
  c8: {
    id: 'c8', name: 'Lakshmi Iyer', subtitle: 'Tiffin Centre', routeId: 'r2',
    outstandingCredit: 600,
    transactions: [
      { id: 't8a', customerId: 'c8', date: twoDaysAgo, time: '02:45 PM', trays: 6, amountToBePaid: 600, amountPaid: 0, paymentMethod: 'cash', creditKeptToday: 600, creditChange: -600 },
    ],
  },
  c9: {
    id: 'c9', name: 'Rajan Pillai', subtitle: 'Green Valley Grocery', routeId: 'r2',
    outstandingCredit: 0,
    transactions: [
      { id: 't9a', customerId: 'c9', date: today, time: '02:10 PM', trays: 2, amountToBePaid: 200, amountPaid: 200, paymentMethod: 'cash', creditKeptToday: 0, creditChange: 0 },
    ],
  },
  c10: {
    id: 'c10', name: 'Anjali Singh', subtitle: 'School Canteen', routeId: 'r2',
    outstandingCredit: 1200,
    transactions: [
      { id: 't10a', customerId: 'c10', date: twoDaysAgo, time: '03:00 PM', trays: 150, amountToBePaid: 1500, amountPaid: 300, paymentMethod: 'cash', creditKeptToday: 1200, creditChange: -1200 },
      { id: 't10b', customerId: 'c10', date: yesterday, time: '03:45 PM', trays: 120, amountToBePaid: 1200, amountPaid: 1200, paymentMethod: 'gpay', creditKeptToday: 0, creditChange: 0 },
    ],
  },
}

export const INITIAL_ROUTE_CUSTOMERS: Record<string, string[]> = {
  r1: ['c1', 'c2', 'c3', 'c4', 'c5'],
  r2: ['c6', 'c7', 'c8', 'c9', 'c10'],
}

export const ROUTE_NAMES: Record<string, string> = { r1: 'Route 1', r2: 'Route 2' }
