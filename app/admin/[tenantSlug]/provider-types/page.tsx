'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProviderType {
  id: string
  name: string
  nameSingular: string
  slug: string
  description: string | null
  icon: string | null
  defaultSlotDuration: number
  defaultSlotCapacity: number
  allowGroupSessions: boolean
  isActive: boolean
  displayOrder: number
  _count?: {
    providers: number
  }
}

export default function ProviderTypesPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string

  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    nameSingular: '',
    description: '',
    icon: '👤',
    defaultSlotDuration: 60,
    defaultSlotCapacity: 1,
    allowGroupSessions: false,
  })

  useEffect(() => {
    fetchProviderTypes()
  }, [tenantSlug])

  const fetchProviderTypes = async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/provider-types`)
      const data = await res.json()
      setProviderTypes(data.providerTypes || [])
    } catch (error) {
      console.error('Failed to fetch provider types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/provider-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowForm(false)
        setFormData({
          name: '',
          nameSingular: '',
          description: '',
          icon: '👤',
          defaultSlotDuration: 60,
          defaultSlotCapacity: 1,
          allowGroupSessions: false,
        })
        fetchProviderTypes()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to create provider type:', error)
      alert('Failed to create provider type')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/${tenantSlug}/provider-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      fetchProviderTypes()
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }

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
              <h1 className="text-3xl font-bold text-gray-900">
                Provider Types
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage different types of service providers
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : '+ Add Provider Type'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create Provider Type</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name (Plural) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Personal Trainers"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Name (Singular) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameSingular}
                    onChange={(e) =>
                      setFormData({ ...formData, nameSingular: e.target.value })
                    }
                    placeholder="e.g., Personal Trainer"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="e.g., 💪 🧘 🏃"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Slot Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultSlotDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultSlotDuration: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowGroupSessions"
                    checked={formData.allowGroupSessions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowGroupSessions: e.target.checked,
                        defaultSlotCapacity: e.target.checked ? formData.defaultSlotCapacity : 1,
                      })
                    }
                    className="mr-2"
                  />
                  <label htmlFor="allowGroupSessions" className="text-sm font-medium">
                    Allow group sessions
                  </label>
                </div>

                {formData.allowGroupSessions && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Default Max Capacity
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={formData.defaultSlotCapacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultSlotCapacity: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of people that can book a single time slot
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief description of this provider type..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Provider Type'}
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

        {/* Provider Types List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">All Provider Types</h2>
          </div>
          <div className="p-6">
            {loading && providerTypes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : providerTypes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No provider types yet. Create one to get started!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providerTypes.map((type) => (
                  <div
                    key={type.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-3xl">{type.icon || '👤'}</div>
                      <button
                        onClick={() => toggleActive(type.id, type.isActive)}
                        className={`px-3 py-1 rounded-full text-xs ${
                          type.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {type.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{type.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {type.description || 'No description'}
                    </p>
                    <div className="text-sm text-gray-500 space-y-1 mb-3">
                      <p>
                        ⏱️ {type.defaultSlotDuration} min slots
                      </p>
                      <p>
                        👥 Max capacity: {type.defaultSlotCapacity}
                      </p>
                      <p>
                        {type.allowGroupSessions
                          ? '✅ Group sessions allowed'
                          : '❌ Individual only'}
                      </p>
                      {type._count && (
                        <p className="font-semibold mt-2">
                          {type._count.providers} provider(s)
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/admin/${tenantSlug}/provider-types/${type.id}/edit`}
                      className="block w-full text-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      ✏️ Edit
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
