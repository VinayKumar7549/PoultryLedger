import { settingsRepository } from '../database/repositories/SettingsRepository'
import { BusinessProfile } from '../types'

class BusinessProfileService {
  private cachedProfile: BusinessProfile | null = null

  /**
   * Reads business profile settings from SQLite database with in-memory caching
   */
  async getProfile(): Promise<BusinessProfile> {
    if (this.cachedProfile) {
      return this.cachedProfile
    }

    const businessName = await settingsRepository.get('business_name')
    const ownerName = await settingsRepository.get('owner_name')
    const phoneNumber = await settingsRepository.get('phone_number')
    const address = await settingsRepository.get('address')
    const businessLogo = await settingsRepository.get('business_logo')
    const paymentQrCode = await settingsRepository.get('payment_qr_code')
    const configuredVal = await settingsRepository.get('business_profile_configured')

    const profile: BusinessProfile = {
      businessName: businessName || 'SaiEggCenter',
      ownerName: ownerName || '',
      phoneNumber: phoneNumber || '',
      address: address || '',
      businessLogo: businessLogo || '',
      paymentQrCode: paymentQrCode || '',
      configured: configuredVal === 'true' || Boolean(businessName),
    }

    this.cachedProfile = profile
    return profile
  }

  /**
   * Saves or updates business profile settings in SQLite database
   */
  async saveProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    this.cachedProfile = null

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
    if (profile.paymentQrCode !== undefined) {
      await settingsRepository.set('payment_qr_code', profile.paymentQrCode)
    }

    await settingsRepository.set('business_profile_configured', 'true')

    return await this.getProfile()
  }

  /**
   * Deletes saved QR Code
   */
  async deleteQrCode(): Promise<void> {
    this.cachedProfile = null
    await settingsRepository.set('payment_qr_code', '')
  }

  /**
   * Checks if first launch setup is completed
   */
  async isProfileConfigured(): Promise<boolean> {
    if (this.cachedProfile) {
      return this.cachedProfile.configured
    }
    const configuredVal = await settingsRepository.get('business_profile_configured')
    if (configuredVal === 'true') return true

    const nameVal = await settingsRepository.get('business_name')
    return Boolean(nameVal && nameVal.trim().length > 0)
  }
}

export const businessProfileService = new BusinessProfileService()
