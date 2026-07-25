import { settingsRepository } from '../database/repositories/SettingsRepository'
import { BusinessProfile } from '../types'

class BusinessProfileService {
  /**
   * Reads business profile settings from SQLite database
   */
  async getProfile(): Promise<BusinessProfile> {
    const businessName = await settingsRepository.get('business_name')
    const ownerName = await settingsRepository.get('owner_name')
    const phoneNumber = await settingsRepository.get('phone_number')
    const address = await settingsRepository.get('address')
    const businessLogo = await settingsRepository.get('business_logo')
    const configuredVal = await settingsRepository.get('business_profile_configured')

    return {
      businessName: businessName || 'SaiEggCenter',
      ownerName: ownerName || '',
      phoneNumber: phoneNumber || '',
      address: address || '',
      businessLogo: businessLogo || '',
      configured: configuredVal === 'true' || Boolean(businessName),
    }
  }

  /**
   * Saves or updates business profile settings in SQLite database
   */
  async saveProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    if (profile.businessName !== undefined) {
      await settingsRepository.set('business_name', profile.businessName.trim())
    }
    if (profile.ownerName !== undefined) {
      await settingsRepository.set('owner_name', profile.ownerName.trim())
    }
    if (profile.phoneNumber !== undefined) {
      await settingsRepository.set('phone_number', profile.phoneNumber.trim())
    }
    if (profile.address !== undefined) {
      await settingsRepository.set('address', profile.address.trim())
    }
    if (profile.businessLogo !== undefined) {
      await settingsRepository.set('business_logo', profile.businessLogo.trim())
    }

    await settingsRepository.set('business_profile_configured', 'true')

    return await this.getProfile()
  }

  /**
   * Checks if first launch setup is completed
   */
  async isProfileConfigured(): Promise<boolean> {
    const configuredVal = await settingsRepository.get('business_profile_configured')
    if (configuredVal === 'true') return true

    const nameVal = await settingsRepository.get('business_name')
    return Boolean(nameVal && nameVal.trim().length > 0)
  }
}

export const businessProfileService = new BusinessProfileService()
