import { dbInstance } from '../database'

export interface RouteEntity {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export class RouteRepository {
  async getAll(): Promise<RouteEntity[]> {
    return await dbInstance.query<RouteEntity>('SELECT * FROM routes ORDER BY name ASC')
  }

  async getById(id: string): Promise<RouteEntity | null> {
    const res = await dbInstance.query<RouteEntity>('SELECT * FROM routes WHERE id = ?', [id])
    return res[0] || null
  }

  async create(route: { id: string; name: string }): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      'INSERT INTO routes (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [route.id, route.name, now, now]
    )
  }

  async update(id: string, name: string): Promise<void> {
    const now = new Date().toISOString()
    await dbInstance.execute(
      'UPDATE routes SET name = ?, updated_at = ? WHERE id = ?',
      [name, now, id]
    )
  }

  async delete(id: string): Promise<void> {
    await dbInstance.execute('DELETE FROM routes WHERE id = ?', [id])
  }
}

export const routeRepository = new RouteRepository()
