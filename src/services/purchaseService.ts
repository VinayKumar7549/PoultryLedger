import { EggPurchase } from '../types'
import { purchaseRepository, PurchaseEntity } from '../database'

class PurchaseService {
  private entityToDomain(entity: PurchaseEntity): EggPurchase {
    return {
      id: entity.id,
      date: entity.date,
      time: entity.time,
      trays: entity.trays,
      totalEggs: entity.total_eggs,
      eggType: entity.egg_type as any,
      ratePer100: entity.rate_per_100,
      totalAmount: entity.total_amount,
    }
  }

  async getAllPurchases(): Promise<EggPurchase[]> {
    const list = await purchaseRepository.getAll()
    return list.map(e => this.entityToDomain(e))
  }

  async createPurchase(p: EggPurchase): Promise<EggPurchase[]> {
    await purchaseRepository.create({
      id: p.id,
      date: p.date,
      time: p.time,
      trays: p.trays,
      total_eggs: p.totalEggs,
      egg_type: p.eggType,
      rate_per_100: p.ratePer100,
      total_amount: p.totalAmount,
    })
    return await this.getAllPurchases()
  }

  async updatePurchase(p: EggPurchase): Promise<EggPurchase[]> {
    await purchaseRepository.update(p.id, {
      date: p.date,
      time: p.time,
      trays: p.trays,
      total_eggs: p.totalEggs,
      egg_type: p.eggType,
      rate_per_100: p.ratePer100,
      total_amount: p.totalAmount,
    })
    return await this.getAllPurchases()
  }

  async deletePurchase(id: string): Promise<EggPurchase[]> {
    await purchaseRepository.delete(id)
    return await this.getAllPurchases()
  }
}

export const purchaseService = new PurchaseService()
