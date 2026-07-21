import { Customer } from '../types'
import { customerRepository, routeRepository, CustomerEntity } from '../database'
import { INITIAL_CUSTOMERS, INITIAL_ROUTE_CUSTOMERS } from '../data/seedData'
import { dbInstance } from '../database/database'
import { uid } from '../utils/date'

class CustomerService {
  private customerTransactionsCache: Record<string, any[]> = {}

  async loadCustomersAndRoutes(): Promise<{
    customers: Record<string, Customer>
    routeCustomerMap: Record<string, string[]>
  }> {
    await dbInstance.initDatabase()

    // Seed initial routes if none exist
    const existingRoutes = await routeRepository.getAll()
    if (existingRoutes.length === 0) {
      await routeRepository.create({ id: 'r1', name: 'Route 1' })
      await routeRepository.create({ id: 'r2', name: 'Route 2' })
    }

    // Seed initial customers if none exist
    const existingCustomers = await customerRepository.getAll()
    if (existingCustomers.length === 0) {
      for (const [id, c] of Object.entries(INITIAL_CUSTOMERS)) {
        await customerRepository.create({
          id,
          name: c.name,
          subtitle: c.subtitle,
          route_id: c.routeId,
          outstanding_credit: c.outstandingCredit,
        })
        this.customerTransactionsCache[id] = c.transactions || []
      }
    }

    return await this.fetchCustomersAndRoutes()
  }

  async fetchCustomersAndRoutes(): Promise<{
    customers: Record<string, Customer>
    routeCustomerMap: Record<string, string[]>
  }> {
    const customerEntities = await customerRepository.getAll()

    const customersMap: Record<string, Customer> = {}
    const routeCustomerMap: Record<string, string[]> = { r1: [], r2: [] }

    for (const entity of customerEntities) {
      const initialTx = INITIAL_CUSTOMERS[entity.id]?.transactions || []
      const cachedTx = this.customerTransactionsCache[entity.id] || initialTx

      customersMap[entity.id] = {
        id: entity.id,
        name: entity.name,
        subtitle: entity.subtitle || '',
        routeId: entity.route_id,
        outstandingCredit: entity.outstanding_credit,
        transactions: cachedTx,
      }

      if (!routeCustomerMap[entity.route_id]) {
        routeCustomerMap[entity.route_id] = []
      }
      routeCustomerMap[entity.route_id].push(entity.id)
    }

    return { customers: customersMap, routeCustomerMap }
  }

  async createCustomer(data: {
    id?: string
    name: string
    subtitle?: string
    routeId: string
    outstandingCredit?: number
  }): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    const newId = data.id || 'c' + uid()
    await customerRepository.create({
      id: newId,
      name: data.name,
      subtitle: data.subtitle || '',
      route_id: data.routeId,
      outstanding_credit: data.outstandingCredit || 0,
    })
    this.customerTransactionsCache[newId] = []
    return await this.fetchCustomersAndRoutes()
  }

  async updateCustomer(
    id: string,
    fields: Partial<Customer>
  ): Promise<{ customers: Record<string, Customer>; routeCustomerMap: Record<string, string[]> }> {
    await customerRepository.update(id, {
      name: fields.name,
      subtitle: fields.subtitle,
      route_id: fields.routeId,
      outstanding_credit: fields.outstandingCredit,
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
    delete this.customerTransactionsCache[id]
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

  attachTransaction(customerId: string, tx: any) {
    if (!this.customerTransactionsCache[customerId]) {
      const initialTx = INITIAL_CUSTOMERS[customerId]?.transactions || []
      this.customerTransactionsCache[customerId] = [...initialTx]
    }
    this.customerTransactionsCache[customerId].push(tx)
  }
}

export const customerService = new CustomerService()
