import { useState } from 'react'
import { Customer, Screen } from '../types'
import { ROUTE_NAMES } from '../data/seedData'
import { fmtCurrency } from '../utils/format'
import {
  IconBack,
  IconPlus,
  IconCheck,
  IconChevronRight,
  IconTrash,
} from '../components/common/Icons'

export function RouteScreen({
  routeId,
  customers,
  routeCustomers,
  navigate,
  onBack,
  onSaveRouteCustomers,
  onDeleteCustomer,
}: {
  routeId: string
  customers: Record<string, Customer>
  routeCustomers: string[]
  navigate: (s: Screen, r?: string, c?: string) => void
  onBack: () => void
  onSaveRouteCustomers: (routeId: string, ids: string[]) => void
  onDeleteCustomer?: (id: string) => void
}) {
  const routeTitle = ROUTE_NAMES[routeId] || 'Route'
  const currentList = routeCustomers.map(id => customers[id]).filter(Boolean)
  const availableOthers = Object.values(customers).filter(c => c.routeId === routeId && !routeCustomers.includes(c.id))

  const [isEditing, setIsEditing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)

  const handleRemoveCustomer = (id: string) => {
    onSaveRouteCustomers(routeId, routeCustomers.filter(cId => cId !== id))
  }

  const handleAddCustomer = (id: string) => {
    onSaveRouteCustomers(routeId, [...routeCustomers, id])
    setShowAddModal(false)
  }

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      if (onDeleteCustomer) {
        onDeleteCustomer(customerToDelete.id)
      } else {
        handleRemoveCustomer(customerToDelete.id)
      }
      setCustomerToDelete(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center active:bg-gray-100" style={{ color: '#111827' }}>
            <IconBack />
          </button>
          <div>
            <h2 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827' }}>{routeTitle}</h2>
            <p className="text-xs" style={{ color: '#6b7280' }}>{currentList.length} customers listed</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-700 active:scale-95 transition-transform"
          style={{
            background: isEditing ? '#059669' : '#f3f4f6',
            color: isEditing ? 'white' : '#374151',
            fontWeight: 700,
          }}
        >
          {isEditing ? <IconCheck /> : <IconPlus />}
          <span>{isEditing ? 'Done' : 'Edit List'}</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full flex flex-col gap-3 shadow-2xl"
            style={{ border: '1.5px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#fef2f2', color: '#dc2626' }}
              >
                <IconTrash />
              </div>
              <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>
                Delete Customer?
              </h3>
            </div>

            <p className="text-sm font-600 mt-1" style={{ color: '#374151', fontWeight: 600 }}>
              Are you sure you want to delete <span className="font-800 text-gray-900">"{customerToDelete.name}"</span>?
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              This action cannot be undone. All transaction history and credit records for this customer will also be removed.
            </p>

            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-3 rounded-xl font-700 text-sm active:scale-95 transition-transform"
                style={{
                  background: 'transparent',
                  border: '2px solid #059669',
                  color: '#059669',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                className="flex-1 py-3 rounded-xl font-700 text-sm active:scale-95 transition-transform"
                style={{
                  background: '#dc2626',
                  color: 'white',
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {currentList.map(customer => {
          const hasCredit = customer.outstandingCredit > 0
          return (
            <div
              key={customer.id}
              className="rounded-2xl border flex items-center justify-between p-4 transition-all"
              style={{
                background: hasCredit ? '#fff5f5' : '#f9fafb',
                borderColor: hasCredit ? '#fecaca' : '#e5e7eb',
              }}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-base font-700 truncate" style={{ fontWeight: 700, color: '#111827' }}>
                  {customer.name}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>
                  {customer.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-xs font-700 px-2.5 py-0.5 rounded-full"
                    style={{
                      background: hasCredit ? '#fee2e2' : '#d1fae5',
                      color: hasCredit ? '#dc2626' : '#065f46',
                      fontWeight: 700,
                    }}
                  >
                    {hasCredit ? `Outstanding: ${fmtCurrency(customer.outstandingCredit)}` : 'No Outstanding Credit'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <button
                    onClick={() => setCustomerToDelete(customer)}
                    className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: '#fee2e2', color: '#dc2626' }}
                  >
                    <IconTrash />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('transaction', routeId, customer.id)}
                    className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-700 active:scale-95 transition-transform"
                    style={{ background: '#059669', color: 'white', fontWeight: 700 }}
                  >
                    <span>Record Sale</span>
                    <IconChevronRight />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {isEditing && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-700 active:bg-emerald-50 transition-colors mt-2"
            style={{ borderColor: '#059669', color: '#059669', fontWeight: 700 }}
          >
            <IconPlus />
            <span>Add Customer to {routeTitle}</span>
          </button>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl p-5 w-full flex flex-col gap-3 shadow-2xl max-h-96" style={{ border: '1.5px solid #e5e7eb' }}>
            <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>Add Customer</h3>
            <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
              {availableOthers.length === 0 ? (
                <p className="text-xs py-4 text-center" style={{ color: '#6b7280' }}>All customers for this route are already added.</p>
              ) : (
                availableOthers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAddCustomer(c.id)}
                    className="flex items-center justify-between p-3 rounded-xl border text-left active:bg-emerald-50"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    <div>
                      <p className="text-sm font-700" style={{ color: '#111827' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>{c.subtitle}</p>
                    </div>
                    <span className="text-xs font-700 px-2.5 py-1 rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>+ Add</span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full py-3 rounded-xl font-700 text-xs mt-2"
              style={{ background: '#f3f4f6', color: '#4b5563' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
