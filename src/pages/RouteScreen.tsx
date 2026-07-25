import { useState } from 'react'
import { Customer, Screen } from '../types'
import { RouteEntity } from '../database'
import { fmtCurrency } from '../utils/format'
import { SearchBar } from '../components/common/SearchBar'
import {
  IconBack,
  IconPlus,
  IconCheck,
  IconChevronRight,
  IconTrash,
  IconEdit,
} from '../components/common/Icons'

export function RouteScreen({
  routeId,
  customers,
  routeCustomers,
  routes,
  routeNames,
  navigate,
  onBack,
  onSaveRouteCustomers,
  onDeleteCustomer,
  onCreateCustomer,
  onUpdateCustomer,
  onCreateRoute,
  onRenameRoute,
  onDeleteRoute,
}: {
  routeId: string
  customers: Record<string, Customer>
  routeCustomers: string[]
  routes?: RouteEntity[]
  routeNames?: Record<string, string>
  navigate: (s: Screen, r?: string, c?: string) => void
  onBack: () => void
  onSaveRouteCustomers: (routeId: string, ids: string[]) => void
  onDeleteCustomer?: (id: string) => void
  onCreateCustomer?: (name: string, subtitle: string, routeId: string, openingCredit?: number) => void
  onUpdateCustomer?: (id: string, name: string, subtitle: string, routeId: string, openingCredit?: number) => void
  onCreateRoute?: (name: string) => void
  onRenameRoute?: (id: string, newName: string) => void
  onDeleteRoute?: (id: string) => void
}) {
  const routeTitle = (routeNames && routeNames[routeId]) || 'Route'

  // Single Source of Truth: filter from customers prop directly using routeId
  const allCustomerList = Object.values(customers || {})
  const currentList = allCustomerList.filter(c => c.routeId === routeId)
  const availableOthers = allCustomerList.filter(c => c.routeId !== routeId)

  const routeOptions =
    routes && routes.length > 0
      ? routes.map(r => ({ id: r.id, name: r.name }))
      : routeNames
      ? Object.entries(routeNames).map(([id, name]) => ({ id, name }))
      : [{ id: routeId, name: routeTitle }]

  const [isEditing, setIsEditing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Route Rename & Delete Modal states
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null)
  const [showConfirmDeleteRoute, setShowConfirmDeleteRoute] = useState(false)

  // Customer form inputs (Add / Edit)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerSubtitle, setCustomerSubtitle] = useState('')
  const [customerRouteId, setCustomerRouteId] = useState(routeId)
  const [customerOpeningCredit, setCustomerOpeningCredit] = useState('0')

  const filteredList = currentList.filter(c => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return c.name.toLowerCase().includes(q) || (c.subtitle || '').toLowerCase().includes(q)
  })

  const handleOpenAddModal = () => {
    setEditingCustomer(null)
    setCustomerName('')
    setCustomerSubtitle('')
    setCustomerRouteId(routeId)
    setCustomerOpeningCredit('0')
    setShowAddModal(true)
  }

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer)
    setCustomerName(customer.name)
    setCustomerSubtitle(customer.subtitle || '')
    setCustomerRouteId(customer.routeId)
    setCustomerOpeningCredit(String(customer.openingCredit || 0))
    setShowAddModal(true)
  }

  const handleRemoveCustomer = (id: string) => {
    const remainingIds = currentList.filter(c => c.id !== id).map(c => c.id)
    onSaveRouteCustomers(routeId, remainingIds)
  }

  const handleAddCustomer = (id: string) => {
    const updatedIds = [...currentList.map(c => c.id), id]
    onSaveRouteCustomers(routeId, updatedIds)
    setShowAddModal(false)
  }

  const handleSaveCustomer = () => {
    if (!customerName.trim()) return
    const openingNum = parseFloat(customerOpeningCredit) || 0

    if (editingCustomer) {
      if (onUpdateCustomer) {
        onUpdateCustomer(editingCustomer.id, customerName.trim(), customerSubtitle.trim(), customerRouteId, openingNum)
      }
    } else {
      if (onCreateCustomer) {
        onCreateCustomer(customerName.trim(), customerSubtitle.trim(), customerRouteId, openingNum)
      }
    }
    setShowAddModal(false)
    setEditingCustomer(null)
    setCustomerName('')
    setCustomerSubtitle('')
    setCustomerOpeningCredit('0')
  }

  const handleSaveRenameRoute = () => {
    if (!renameText.trim()) return
    if (onRenameRoute) {
      onRenameRoute(routeId, renameText.trim())
    }
    setShowRenameModal(false)
  }

  const handleAttemptDeleteRoute = () => {
    if (currentList.length > 0) {
      setDeleteWarning(
        `Cannot delete "${routeTitle}". This route still has ${currentList.length} customer(s). Please move or reassign customers to another route first.`
      )
    } else {
      setShowConfirmDeleteRoute(true)
    }
  }

  const handleConfirmDeleteRoute = () => {
    if (onDeleteRoute) {
      onDeleteRoute(routeId)
    }
    setShowConfirmDeleteRoute(false)
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
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-800" style={{ fontWeight: 800, color: '#111827' }}>{routeTitle}</h2>
              <button
                onClick={() => {
                  setRenameText(routeTitle)
                  setShowRenameModal(true)
                }}
                title="Rename Route"
                className="p-1 rounded-lg text-gray-400 hover:text-emerald-600 active:scale-95 transition-transform"
              >
                <IconEdit />
              </button>
            </div>
            <p className="text-xs" style={{ color: '#6b7280' }}>{currentList.length} customers listed</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={handleAttemptDeleteRoute}
              title="Delete Route"
              className="p-2 rounded-full text-red-600 bg-red-50 hover:bg-red-100 active:scale-95 transition-transform"
            >
              <IconTrash />
            </button>
          )}

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
      </div>

      {/* Rename Route Modal */}
      {showRenameModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl" style={{ border: '1.5px solid #e5e7eb' }}>
            <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>Rename Route</h3>
            <div>
              <label className="text-xs font-700 text-gray-600 mb-1 block">New Route Name</label>
              <input
                type="text"
                value={renameText}
                onChange={e => setRenameText(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white rounded-xl border outline-none focus:border-emerald-500 font-600"
                style={{ borderColor: '#e5e7eb', color: '#111827' }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-gray-600 bg-gray-100 active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRenameRoute}
                disabled={!renameText.trim()}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-white bg-emerald-600 active:scale-95 transition-transform disabled:opacity-50"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Route Warning Modal */}
      {deleteWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl" style={{ border: '1.5px solid #e5e7eb' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600 flex-shrink-0">
                <IconTrash />
              </div>
              <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>Cannot Delete Route</h3>
            </div>
            <p className="text-xs text-gray-600 font-500 leading-relaxed">{deleteWarning}</p>
            <button
              onClick={() => setDeleteWarning(null)}
              className="w-full py-3 rounded-xl font-700 text-xs text-white bg-emerald-600 active:scale-95 transition-transform mt-2"
            >
              Understand & Move Customers First
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Empty Route Modal */}
      {showConfirmDeleteRoute && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-2xl" style={{ border: '1.5px solid #e5e7eb' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-600 flex-shrink-0">
                <IconTrash />
              </div>
              <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>Delete Route?</h3>
            </div>
            <p className="text-xs text-gray-600 font-500">
              Are you sure you want to delete <span className="font-700 text-gray-900">"{routeTitle}"</span>? This route is currently empty.
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowConfirmDeleteRoute(false)}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-gray-600 bg-gray-100 active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteRoute}
                className="flex-1 py-2.5 rounded-xl font-700 text-xs text-white bg-red-600 active:scale-95 transition-transform"
              >
                Delete Route
              </button>
            </div>
          </div>
        </div>
      )}

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
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search customer name or shop..."
        />

        {isEditing && (
          <button
            onClick={handleOpenAddModal}
            className="w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-700 active:bg-emerald-50 transition-colors mb-1"
            style={{ borderColor: '#059669', color: '#059669', fontWeight: 700 }}
          >
            <IconPlus />
            <span>Add Customer to {routeTitle}</span>
          </button>
        )}

        {filteredList.map(customer => {
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
                  <>
                    <button
                      onClick={() => handleOpenEditModal(customer)}
                      title="Edit Customer"
                      className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: '#e0f2fe', color: '#0284c7' }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => setCustomerToDelete(customer)}
                      title="Delete Customer"
                      className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: '#fee2e2', color: '#dc2626' }}
                    >
                      <IconTrash />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(customer)}
                      title="Edit Customer"
                      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: '#f3f4f6', color: '#4b5563' }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => navigate('transaction', routeId, customer.id)}
                      className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-xs font-700 active:scale-95 transition-transform"
                      style={{ background: '#059669', color: 'white', fontWeight: 700 }}
                    >
                      <span>Record Sale</span>
                      <IconChevronRight />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-3xl p-5 w-full flex flex-col gap-3 shadow-2xl max-h-[85vh] overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
            <h3 className="text-lg font-800" style={{ fontWeight: 800, color: '#111827' }}>
              {editingCustomer ? 'Edit Customer' : 'Add Customer'}
            </h3>
            
            {/* Customer Form */}
            <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-2xl border" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-xs font-700 uppercase tracking-wider text-gray-500">
                {editingCustomer ? 'Customer Details' : 'Create New Customer'}
              </p>
              
              <div>
                <label className="text-xs font-700 text-gray-600 mb-1 block">Customer Name</label>
                <input
                  type="text"
                  placeholder="Customer Name (e.g. Ramesh)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>

              <div>
                <label className="text-xs font-700 text-gray-600 mb-1 block">Shop / Subtitle / Village</label>
                <input
                  type="text"
                  placeholder="Village / Details (Optional)"
                  value={customerSubtitle}
                  onChange={e => setCustomerSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border focus:outline-none focus:border-emerald-500"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>

              <div>
                <label className="text-xs font-700 text-gray-600 mb-1 block">Route</label>
                <select
                  value={customerRouteId}
                  onChange={e => setCustomerRouteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border focus:outline-none focus:border-emerald-500 font-600"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {routeOptions.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-700 text-gray-600 mb-1 block">Opening Credit (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={customerOpeningCredit}
                  onChange={e => setCustomerOpeningCredit(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white rounded-xl border focus:outline-none focus:border-emerald-500 font-600"
                  style={{ borderColor: '#e5e7eb' }}
                />
              </div>

              <button
                onClick={handleSaveCustomer}
                disabled={!customerName.trim()}
                className="w-full py-2.5 rounded-xl font-700 text-xs active:scale-98 transition-all disabled:opacity-50 text-white mt-1"
                style={{ background: '#059669' }}
              >
                {editingCustomer ? 'Save Changes' : 'Create & Add Customer'}
              </button>
            </div>

            {!editingCustomer && (
              <>
                <div style={{ height: '1px', background: '#e5e7eb' }} />
                <p className="text-xs font-700 uppercase tracking-wider text-gray-500 px-1">Move from other routes</p>

                <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
                  {availableOthers.length === 0 ? (
                    <p className="text-xs py-4 text-center" style={{ color: '#6b7280' }}>No other existing customers found.</p>
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
              </>
            )}

            <button
              onClick={() => {
                setShowAddModal(false)
                setEditingCustomer(null)
              }}
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

