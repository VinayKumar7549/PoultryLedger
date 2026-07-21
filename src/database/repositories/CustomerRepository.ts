import { dbInstance } from '../database'

export interface CustomerEntity {
  id: string
  name: string
  subtitle?: string
  route_id: string
  outstanding_credit: number
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
    outstanding_credit?: number
  }): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      `INSERT INTO customers (id, name, subtitle, route_id, outstanding_credit, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.name,
        customer.subtitle || '',
        customer.route_id,
        customer.outstanding_credit || 0,
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
    const outstanding_credit = fields.outstanding_credit !== undefined ? fields.outstanding_credit : existing.outstanding_credit

    await dbInstance.execute(
      `UPDATE customers SET name = ?, subtitle = ?, route_id = ?, outstanding_credit = ?, updated_at = ?
       WHERE id = ?`,
      [name, subtitle, route_id, outstanding_credit, now, id]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM customers WHERE id = ?', [id])
  }
}

export const customerRepository = new CustomerRepository()
