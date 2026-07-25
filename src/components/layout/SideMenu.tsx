import { useState, useEffect } from 'react'
import { Screen, BusinessProfile } from '../../types'
import { businessProfileService } from '../../services/businessProfileService'
import { IconEgg, IconClose, IconList, IconCreditCard, IconWallet, IconBox, IconHistory } from '../common/Icons'

export function SideMenu({
  visible,
  onClose,
  onNavigate,
  currentScreen,
}: {
  visible: boolean
  onClose: () => void
  onNavigate: (s: Screen) => void
  currentScreen: Screen
}) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)

  useEffect(() => {
    if (visible) {
      businessProfileService.getProfile().then(setProfile).catch(console.error)
    }
  }, [visible])

  return (
    <>
      {visible && (
        <div
          className="absolute inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        />
      )}
      <div
        className="absolute top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width: '280px',
          background: 'white',
          transform: visible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
          boxShadow: visible ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-5 pt-10 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs" style={{ background: '#059669' }}>
              <div style={{ color: 'white', transform: 'scale(0.75)' }}>
                <IconEgg />
              </div>
            </div>
            <div className="overflow-hidden max-w-[170px]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                {profile?.ownerName ? `Prop: ${profile.ownerName}` : 'PoultryLedger'}
              </p>
              <p className="text-sm font-extrabold text-gray-900 truncate">
                {profile?.businessName || 'Sai Egg Center'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200">
            <IconClose />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col px-3 py-3 gap-1 overflow-y-auto">
          {[
            { screen: 'history' as Screen, label: 'Daily Transactions', icon: <IconList /> },
            { screen: 'credit' as Screen, label: 'Credit Records', icon: <IconCreditCard /> },
            { screen: 'expenseHistory' as Screen, label: 'Expense History', icon: <IconWallet /> },
            { screen: 'inventory' as Screen, label: 'Inventory Management', icon: <IconBox /> },
            { screen: 'reports' as Screen, label: 'Reports & Analytics', icon: <IconHistory /> },
            { screen: 'backup' as Screen, label: 'Backup & Restore', icon: <IconBox /> },
            {
              screen: 'profile' as Screen,
              label: 'Business Profile',
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h4M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              ),
            },
          ].map(item => (
            <button
              key={item.screen}
              onClick={() => {
                onNavigate(item.screen)
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-98 transition-transform"
              style={{
                background: currentScreen === item.screen ? '#d1fae5' : 'transparent',
                color: currentScreen === item.screen ? '#059669' : '#374151',
              }}
            >
              <span style={{ color: currentScreen === item.screen ? '#059669' : '#6b7280' }}>{item.icon}</span>
              <span className="text-sm font-700" style={{ fontWeight: 700 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom: Home */}
        <div className="mt-auto px-3 pb-8">
          <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0' }} />
          <button
            onClick={() => {
              onNavigate('home')
              onClose()
            }}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left w-full active:scale-98 transition-transform"
            style={{ background: '#f9fafb', color: '#374151' }}
          >
            <div style={{ color: '#6b7280' }}>
              <IconEgg />
            </div>
            <span className="text-sm font-700" style={{ fontWeight: 700 }}>Home</span>
          </button>
        </div>
      </div>
    </>
  )
}
