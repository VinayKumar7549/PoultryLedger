import { Screen } from '../../types'
import { IconEgg, IconClose, IconList, IconCreditCard, IconWallet, IconBox } from '../common/Icons'

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
        <div className="flex items-center justify-between px-5 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#059669' }}>
              <div style={{ color: 'white', transform: 'scale(0.7)' }}>
                <IconEgg />
              </div>
            </div>
            <div>
              <p className="text-xs" style={{ color: '#6b7280' }}>Egg Delivery</p>
              <p className="text-sm font-800" style={{ fontWeight: 800, color: '#111827' }}>Sales App</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100">
            <IconClose />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col px-3 gap-1">
          {[
            { screen: 'history' as Screen, label: 'Daily Transactions', icon: <IconList /> },
            { screen: 'credit' as Screen, label: 'Credit Records', icon: <IconCreditCard /> },
            { screen: 'expenseHistory' as Screen, label: 'Expense History', icon: <IconWallet /> },
            { screen: 'inventory' as Screen, label: 'Inventory Management', icon: <IconBox /> },
          ].map(item => (
            <button
              key={item.screen}
              onClick={() => {
                onNavigate(item.screen)
                onClose()
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left active:scale-98 transition-transform"
              style={{
                background: currentScreen === item.screen ? '#d1fae5' : 'transparent',
                color: currentScreen === item.screen ? '#059669' : '#374151',
              }}
            >
              <span style={{ color: currentScreen === item.screen ? '#059669' : '#6b7280' }}>{item.icon}</span>
              <span className="text-base font-700" style={{ fontWeight: 700 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom: Home */}
        <div className="mt-auto px-3 pb-8">
          <div style={{ height: '1px', background: '#f3f4f6', margin: '16px 0' }} />
          <button
            onClick={() => {
              onNavigate('home')
              onClose()
            }}
            className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left w-full active:scale-98 transition-transform"
            style={{ background: '#f9fafb', color: '#374151' }}
          >
            <div style={{ color: '#6b7280' }}>
              <IconEgg />
            </div>
            <span className="text-base font-700" style={{ fontWeight: 700 }}>Home</span>
          </button>
        </div>
      </div>
    </>
  )
}
