import { useState, useEffect } from 'react'
import { Screen, BusinessProfile } from '../../types'
import { businessProfileService } from '../../services/businessProfileService'
import { IconBrandLogoBadge, IconClose, IconList, IconCreditCard, IconWallet, IconBox, IconHistory } from '../common/Icons'

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
  const [showAbout, setShowAbout] = useState(false)

  useEffect(() => {
    if (visible) {
      businessProfileService.getProfile().then(setProfile).catch(console.error)
    }
  }, [visible])

  const menuSections = [
    {
      title: 'DAILY OPERATIONS',
      items: [
        {
          screen: 'home' as Screen,
          label: 'Home',
          subLabel: 'Today’s deliveries & overview',
          icon: <IconBrandLogoBadge size="sm" />,
        },
        {
          screen: 'history' as Screen,
          label: 'Sales Register',
          subLabel: 'Daily sales & payment log',
          icon: <IconList />,
        },
        {
          screen: 'credit' as Screen,
          label: 'Customer Ledger',
          subLabel: 'Customer balances & pending credit',
          icon: <IconCreditCard />,
        },
        {
          screen: 'inventory' as Screen,
          label: 'Stock & Purchases',
          subLabel: 'Egg stock & supplier purchases',
          icon: <IconBox />,
        },
        {
          screen: 'expenseHistory' as Screen,
          label: 'Expenses',
          subLabel: 'Shop expenses & bill records',
          icon: <IconWallet />,
        },
      ],
    },
    {
      title: 'REPORTS & SETTINGS',
      items: [
        {
          screen: 'reports' as Screen,
          label: 'Reports',
          subLabel: 'Sales, profit & customer PDF statements',
          icon: <IconHistory />,
        },
        {
          screen: 'profile' as Screen,
          label: 'Shop Profile',
          subLabel: 'Business name & bill invoice headers',
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
        {
          screen: 'backup' as Screen,
          label: 'Backup & Restore',
          subLabel: 'Keep records safe & restore anytime',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          ),
        },
      ],
    },
  ]

  return (
    <>
      {visible && (
        <div
          className="absolute inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}
      <div
        className="absolute top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width: '290px',
          background: 'white',
          transform: visible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
          boxShadow: visible ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between px-5 pt-8 pb-5 border-b border-gray-100 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <IconBrandLogoBadge size="md" />
            <div className="overflow-hidden max-w-[170px]">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white truncate">PoultryLedger</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">v1.0</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-400 truncate mt-0.5">
                {profile?.businessName || 'Sai Egg Center'}
              </p>
              {profile?.ownerName && (
                <p className="text-[10px] text-gray-400 truncate">Prop: {profile.ownerName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 text-gray-300 active:scale-95 transition-transform"
          >
            <IconClose />
          </button>
        </div>

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
          {menuSections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 mb-1">
                {section.title}
              </p>
              {section.items.map(item => {
                const isActive = currentScreen === item.screen
                return (
                  <button
                    key={item.screen}
                    onClick={() => {
                      onNavigate(item.screen)
                      onClose()
                    }}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left active:scale-98 transition-all"
                    style={{
                      background: isActive ? '#ecfdf5' : 'transparent',
                      border: isActive ? '1px solid #a7f3d0' : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isActive ? '#059669' : '#f3f4f6',
                        color: isActive ? 'white' : '#4b5563',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-extrabold truncate"
                        style={{ color: isActive ? '#065f46' : '#1f2937' }}
                      >
                        {item.label}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {item.subLabel}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBrandLogoBadge size="sm" />
            <div>
              <p className="text-xs font-extrabold text-gray-900 leading-tight">PoultryLedger</p>
              <p className="text-[10px] text-gray-500 font-medium">The Smart Egg Ledger</p>
            </div>
          </div>
          <button
            onClick={() => setShowAbout(true)}
            className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shadow-2xs"
          >
            About
          </button>
        </div>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl border border-gray-100">
            <IconBrandLogoBadge size="xl" />
            <div>
              <h2 className="text-xl font-black text-gray-900">PoultryLedger</h2>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">The Smart Egg Ledger • v1.0.0</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              Offline business ledger app designed specifically for egg wholesalers, poultry distributors, and retail shop owners to track sales, Udhar credit, inventory & bills.
            </p>
            <div className="w-full text-[11px] text-gray-400 border-t border-gray-100 pt-3 flex items-center justify-between">
              <span>100% Offline & Private</span>
              <span>© 2026 PoultryLedger</span>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="w-full py-3 bg-emerald-600 text-white font-extrabold text-xs rounded-2xl shadow-md hover:bg-emerald-700 active:scale-98 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
