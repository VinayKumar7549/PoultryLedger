import { dbInstance } from '../database'

export interface CustomerEntity {
  id: string
  name: string
  subtitle?: string
  route_id: string
  opening_credit: number
  outstanding_credit: number
  opening_credit_created_at?: string
  created_at?: string
  updated_at?: string
}

export class CustomerRepository {
  async getAll(): Promise<CustomerEntity[]> {
    return await dbInstance.query<CustomerEntity>('SELECT * FROM customers ORDER BY name ASC')
  }

  async getById(id: string): Promise<CustomerEntity | null> {
    const res = await dbInstance.query<CustomerEntity>('SELECT * FROM customers WHERE id = ?', [id])
    return res[0] || null
  }

  async getByRouteId(routeId: string): Promise<CustomerEntity[]> {
    return await dbInstance.query<CustomerEntity>(
      'SELECT * FROM customers WHERE route_id = ? ORDER BY name ASC',
      [routeId]
    )
  }

  async create(customer: {
    id: string
    name: string
    subtitle?: string
    route_id: string
    opening_credit?: number
    outstanding_credit?: number
    opening_credit_created_at?: string
  }): Promise<void> {
    const now = new Date().toISOString()
    const opening = customer.opening_credit || 0
    const outstanding = customer.outstanding_credit !== undefined ? customer.outstanding_credit : opening
    const openingCreatedAt = opening > 0 ? (customer.opening_credit_created_at || now) : null
    await dbInstance.execute(
      `INSERT INTO customers (id, name, subtitle, route_id, opening_credit, outstanding_credit, opening_credit_created_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        customer.subtitle || '',
        customer.route_id,
        opening,
        outstanding,
        openingCreatedAt,
        now,
        now,
      ]
    )
  }

  async update(id: string, fields: Partial<Omit<CustomerEntity, 'id'>>): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) return

    const now = new Date().toISOString()
    const name = fields.name !== undefined ? fields.name : existing.name
    const subtitle = fields.subtitle !== undefined ? fields.subtitle : existing.subtitle
    const route_id = fields.route_id !== undefined ? fields.route_id : existing.route_id
    const opening_credit = fields.opening_credit !== undefined ? fields.opening_credit : (existing.opening_credit || 0)
    const outstanding_credit = fields.outstanding_credit !== undefined ? fields.outstanding_credit : existing.outstanding_credit

    let opening_credit_created_at = existing.opening_credit_created_at
    if (opening_credit > 0) {
      if (fields.opening_credit_created_at !== undefined) {
        opening_credit_created_at = fields.opening_credit_created_at
      } else if (!opening_credit_created_at) {
        opening_credit_created_at = now
      }
    } else {
      opening_credit_created_at = undefined
    }

    await dbInstance.execute(
      `UPDATE customers SET name = ?, subtitle = ?, route_id = ?, opening_credit = ?, outstanding_credit = ?, opening_credit_created_at = ?, updated_at = ?
       WHERE id = ?`,
      [name, subtitle, route_id, opening_credit, outstanding_credit, opening_credit_created_at || null, now, id]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM customers WHERE id = ?', [id])
  }
}

export const customerRepository = new CustomerRepository()
