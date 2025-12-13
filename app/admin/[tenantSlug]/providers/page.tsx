'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/app/components/UserMenu'

interface Provider {
  id: string
  name: string
  email: string
  slug: string
  bio: string | null
  profileImageUrl: string | null
  isActive: boolean
  acceptingBookings: boolean
  defaultHourlyRate: number | null
  providerType: {
    id: string
    name: string
    icon: string | null
  }
  category: {
    id: string
    name: string
  } | null
  _count?: {
    availability: number
    bookings: number
  }
}

interface ProviderType {
  id: string
  name: string
  icon: string | null
}

export default function ProvidersPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [providers, setProviders] = useState<Provider[]>([])
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    providerTypeId: '',
    defaultHourlyRate: '',
  })

  useEffect(() => {
    fetchData()
  }, [tenantSlug])

  const fetchData = async () => {
    try {
      const [providersRes, typesRes] = await Promise.all([
        fetch(`/api/${tenantSlug}/providers`),
        fetch(`/api/${tenantSlug}/provider-types`),
      ])

      const providersData = await providersRes.json()
      const typesData = await typesRes.json()

      setProviders(providersData.providers || [])
      setProviderTypes(typesData.providerTypes || [])

      if (typesData.providerTypes?.length > 0 && !formData.providerTypeId) {
        setFormData((prev) => ({
          ...prev,
          providerTypeId: typesData.providerTypes[0].id,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({ name: '', email: '', bio: '', providerTypeId: providerTypes[0]?.id || '', defaultHourlyRate: '' })
        fetchData()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create provider:', error)
      alert('Failed to create provider')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id: string, field: 'isActive' | 'acceptingBookings', currentValue: boolean) => {
    try {
      await fetch(`/api/${tenantSlug}/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue }),
      })
      fetchData()
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }

  const filteredProviders = selectedType === 'all'
    ? providers
    : providers.filter((p) => p.providerType.id === selectedType)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href={`/admin/${tenantSlug}`}
                className="text-blue-600 hover:underline text-sm mb-2 block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Providers</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your service providers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={providerTypes.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showForm ? 'Cancel' : '+ Add Provider'}
              </button>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* No Provider Types Warning */}
        {providerTypes.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-yellow-900 mb-2">
              ⚠️ No Provider Types
            </h3>
            <p className="text-yellow-800 mb-4">
              You need to create at least one provider type before adding providers.
            </p>
            <Link
              href={`/admin/${tenantSlug}/provider-types`}
              className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Create Provider Type →
            </Link>
          </div>
        )}

        {/* Create Form */}
        {showForm && providerTypes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Add New Provider</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Smith"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Provider Type *
                  </label>
                  <select
                    required
                    value={formData.providerTypeId}
                    onChange={(e) =>
                      setFormData({ ...formData, providerTypeId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {providerTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief bio and qualifications..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Hourly Rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.defaultHourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultHourlyRate: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This will be used as the default price for this provider's availability slots
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Provider'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        {providerTypes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-4 py-2 rounded-lg ${
                  selectedType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                All ({providers.length})
              </button>
              {providerTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-2 rounded-lg ${
                    selectedType === type.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {type.icon} {type.name} (
                  {providers.filter((p) => p.providerType.id === type.id).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Providers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">All Providers</h2>
          </div>
          <div className="p-6">
            {loading && providers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : filteredProviders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {providers.length === 0
                  ? 'No providers yet. Add one to get started!'
                  : 'No providers found for this filter.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                          {provider.providerType.icon || '👤'}
                        </div>
                        <div>
                          <h3 className="font-bold">{provider.name}</h3>
                          <p className="text-xs text-gray-500">
                            {provider.providerType.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {provider.email}
                    </p>

                    {provider.defaultHourlyRate && (
                      <div className="mb-3 inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        ${provider.defaultHourlyRate}/hr
                      </div>
                    )}

                    {provider.bio && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {provider.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() =>
                          toggleStatus(provider.id, 'isActive', provider.isActive)
                        }
                        className={`px-2 py-1 rounded text-xs ${
                          provider.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() =>
                          toggleStatus(
                            provider.id,
                            'acceptingBookings',
                            provider.acceptingBookings
                          )
                        }
                        className={`px-2 py-1 rounded text-xs ${
                          provider.acceptingBookings
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {provider.acceptingBookings
                          ? 'Accepting'
                          : 'Not Accepting'}
                      </button>
                      <Link
                        href={`/admin/${tenantSlug}/providers/${provider.id}/edit`}
                        className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
                      >
                        ✏️ Edit
                      </Link>
                    </div>

                    {provider._count && (
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>📅 {provider._count.availability} availability slots</p>
                        <p>📝 {provider._count.bookings} bookings</p>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href={`/admin/${tenantSlug}/providers/${provider.id}/availability`}
                        className="block text-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        📅 Time Slots
                      </Link>
                      <Link
                        href={`/admin/${tenantSlug}/providers/${provider.id}/portfolio`}
                        className="block text-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                      >
                        ✨ Portfolio
                      </Link>
                    </div>
                    <Link
                      href={`/${tenantSlug}/${provider.slug}`}
                      target="_blank"
                      className="mt-2 w-full block text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                    >
                      👁️ View Public Profile
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
