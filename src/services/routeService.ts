import { routeRepository, RouteEntity } from '../database'
import { uid } from '../utils/date'

class RouteService {
  async loadRoutes(): Promise<{
    routes: RouteEntity[]
    routeNames: Record<string, string>
  }> {
    let existingRoutes = await routeRepository.getAll()

    if (existingRoutes.length === 0) {
      await routeRepository.create({ id: 'r_' + uid(), name: 'Main Route' })
      existingRoutes = await routeRepository.getAll()
    }

    const routeNames: Record<string, string> = {}
    for (const r of existingRoutes) {
      routeNames[r.id] = r.name
    }

    return { routes: existingRoutes, routeNames }
  }

  async getAllRoutes(): Promise<RouteEntity[]> {
    return await routeRepository.getAll()
  }

  async getRouteById(id: string): Promise<RouteEntity | null> {
    return await routeRepository.getById(id)
  }

  async createRoute(name: string, id?: string): Promise<{
    routes: RouteEntity[]
    routeNames: Record<string, string>
  }> {
    const routeId = id || 'r' + uid()
    await routeRepository.create({ id: routeId, name })
    return await this.loadRoutes()
  }

  async updateRoute(id: string, name: string): Promise<{
    routes: RouteEntity[]
    routeNames: Record<string, string>
  }> {
    await routeRepository.update(id, name)
    return await this.loadRoutes()
  }

  async deleteRoute(id: string): Promise<{
    routes: RouteEntity[]
    routeNames: Record<string, string>
  }> {
    await routeRepository.delete(id)
    return await this.loadRoutes()
  }

  async getRouteNames(): Promise<Record<string, string>> {
    const res = await this.loadRoutes()
    return res.routeNames
  }
}

export const routeService = new RouteService()
