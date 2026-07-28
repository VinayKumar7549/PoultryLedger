import { Customer } from '../types'
import { customerRepository } from '../database'
import { uid } from '../utils/date'
import { transactionService } from './transactionService'

class CustomerService {
  async fetchCustomersAndRoutes(): Promise<{
    customers: Record<string, Customer>
    routeCustomerMap: Record<string, string[]>
  }> {
    const customerEntities = await customerRepository.getAll()
    const allTransactions = await transactionService.getAllTransactions()

    const txByCustomer: Record<string, typeof allTransactions> = {}
    for (const tx of allTransactions) {
      if (!txByCustomer[tx.customerId]) {
        txByCustomer[tx.customerId] = []
      }
      txByCustomer[tx.customerId].push(tx)
    }

    const customersMap: Record<string, Customer> = {}
    const routeCustomerMap: Record<string, string[]> = {}

    for (const entity of customerEntities) {
      const custTx = txByCustomer[entity.id] || []
      const rId = entity.route_id || ''
      const openingCredit = Number(entity.opening_credit) || 0

      const totalSales = custTx.reduce((sum, t) => sum + (t.amountToBePaid || 0), 0)
      const totalPayments = custTx.reduce((sum, t) => sum + (t.amountPaid || 0), 0)
      const calculatedOutstanding = openingCredit + totalSales - totalPayments

      customersMap[entity.id] = {
        id: entity.id,
        name: entity.name,
        subtitle: entity.subtitle || '',
        routeId: rId,
        openingCredit,
        outstandingCredit: calculatedOutstanding,
        openingCreditCreatedAt: entity.opening_credit_created_at,
        transactions: custTx,
      }

      if (!routeCustomerMap[rId]) {
        routeCustomerMap[rId] = []
      }
      routeCustomerMap[rId].push(entity.id)
    }

    return { customers: customersMap, routeCustomerMap }
  }

  async createCustomer(data: {
    id?: string
    name: string
    subtitle?: string
    routeId: string
    openingCredit?: number
    outstandingCredit?: number
    openingCreditCreatedAt?: string
  }): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    const newId = data.id || 'c' + uid()
    const opening = data.openingCredit || 0
    const outstanding = data.outstandingCredit !== undefined ? data.outstandingCredit : opening
    const openingCreatedAt = opening > 0 ? (data.openingCreditCreatedAt || new Date().toISOString()) : undefined
    await customerRepository.create({
      id: newId,
      name: data.name,
      subtitle: data.subtitle || '',
      route_id: data.routeId,
      opening_credit: opening,
      outstanding_credit: outstanding,
      opening_credit_created_at: openingCreatedAt,
    })
    return await this.fetchCustomersAndRoutes()
  }

  async updateCustomer(
    id: string,
    fields: Partial<Customer>
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    const existing = await customerRepository.getById(id)
    if (!existing) return await this.fetchCustomersAndRoutes()

    const newOpeningCredit = fields.openingCredit !== undefined ? fields.openingCredit : (existing.opening_credit || 0)
    const txs = await transactionService.getByCustomerId(id)
    const totalSales = txs.reduce((sum, t) => sum + (t.amountToBePaid || 0), 0)
    const totalPayments = txs.reduce((sum, t) => sum + (t.amountPaid || 0), 0)
    const calculatedOutstanding = newOpeningCredit + totalSales - totalPayments

    let openingCreatedAt = existing.opening_credit_created_at
    if (newOpeningCredit > 0) {
      if (fields.openingCreditCreatedAt !== undefined) {
        openingCreatedAt = fields.openingCreditCreatedAt
      } else if (!openingCreatedAt) {
        openingCreatedAt = new Date().toISOString()
      }
    } else {
      openingCreatedAt = undefined
    }

    await customerRepository.update(id, {
      name: fields.name,
      subtitle: fields.subtitle,
      route_id: fields.routeId,
      opening_credit: newOpeningCredit,
      outstanding_credit: calculatedOutstanding,
      opening_credit_created_at: openingCreatedAt,
    })
    return await this.fetchCustomersAndRoutes()
  }

  async updateCustomerCredit(
    id: string,
    newOutstandingCredit: number
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    await customerRepository.update(id, {
      outstanding_credit: newOutstandingCredit,
    })
    return await this.fetchCustomersAndRoutes()
  }

  async deleteCustomer(
    id: string
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    await customerRepository.delete(id)
    return await this.fetchCustomersAndRoutes()
  }

  async saveRouteCustomers(
    routeId: string,
    customerIds: string[]
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    const allCustomers = await customerRepository.getAll()

    for (const cust of allCustomers) {
      if (customerIds.includes(cust.id)) {
        if (cust.route_id !== routeId) {
          await customerRepository.update(cust.id, { route_id: routeId })
        }
      }
    }
    return await this.fetchCustomersAndRoutes()
  }

  async assignCustomerToRoute(
    customerId: string,
    routeId: string
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    await customerRepository.update(customerId, { route_id: routeId })
    return await this.fetchCustomersAndRoutes()
  }
}

export const customerService = new CustomerService()
