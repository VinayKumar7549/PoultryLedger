import { settingsRepository } from '../database/repositories/SettingsRepository'

const RECENT_KEY = 'recent_customers'
export const RECENT_CUSTOMERS_LIMIT = 3

class RecentCustomersService {
  async getRecentCustomerIds(): Promise<string[]> {
    try {
      const val = await settingsRepository.get(RECENT_KEY)
      if (!val) return []
      return JSON.parse(val) as string[]
    } catch {
      return []
    }
  }

  async addRecentCustomer(customerId: string): Promise<string[]> {
    if (!customerId) return await this.getRecentCustomerIds()
    try {
      const current = await this.getRecentCustomerIds()
      const filtered = current.filter(id => id !== customerId)
      const updated = [customerId, ...filtered].slice(0, RECENT_CUSTOMERS_LIMIT)
      await settingsRepository.set(RECENT_KEY, JSON.stringify(updated))
      return updated
    } catch {
      return await this.getRecentCustomerIds()
    }
  }
}

export const recentCustomersService = new RecentCustomersService()
