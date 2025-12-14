'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/app/components/UserMenu'

interface ProviderType {
  id: string
  name: string
  nameSingular: string
  description: string | null
  icon: string | null
  defaultSlotDuration: number
  defaultSlotCapacity: number
  allowGroupSessions: boolean
  _count?: {
    providers: number
  }
}

export default function EditProviderTypePage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string
  const providerTypeId = params.id as string

  const [providerType, setProviderType] = useState<ProviderType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    nameSingular: '',
    description: '',
    icon: '👤',
    defaultSlotDuration: 60,
    defaultSlotCapacity: 1,
    allowGroupSessions: false,
  })

  const fetchProviderType = useCallback(async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/provider-types/${providerTypeId}`)
      const data = await res.json()

      if (data.providerType) {
        setProviderType(data.providerType)
        setFormData({
          name: data.providerType.name || '',
          nameSingular: data.providerType.nameSingular || '',
          description: data.providerType.description || '',
          icon: data.providerType.icon || '👤',
          defaultSlotDuration: data.providerType.defaultSlotDuration || 60,
          defaultSlotCapacity: data.providerType.defaultSlotCapacity || 1,
          allowGroupSessions: data.providerType.allowGroupSessions || false,
        })
      }
    } catch (error) {
      console.error('Failed to fetch provider type:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug, providerTypeId])

  useEffect(() => {
    fetchProviderType()
  }, [fetchProviderType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/provider-types/${providerTypeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        alert('Provider type updated successfully!')
        router.push(`/admin/${tenantSlug}/provider-types`)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update provider type:', error)
      alert('Failed to update provider type')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!providerType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Provider type not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <Link
                href={`/admin/${tenantSlug}/provider-types`}
                className="text-blue-600 hover:underline text-sm mb-2 block"
              >
                ← Back to Provider Types
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Provider Type
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Update provider type settings and defaults
              </p>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex gap-2">
                  <div className="w-12 h-12 border rounded-lg flex items-center justify-center text-2xl">
                    {formData.icon}
                  </div>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    placeholder="e.g., 💪 🧘 🏃"
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use an emoji to represent this provider type
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Slot Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.defaultSlotDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultSlotDuration: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default length of each booking slot
                </p>
              </div>
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

            <div className="border-t pt-4">
              <div className="flex items-center mb-4">
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowGroupSessions" className="ml-2 block text-sm font-medium">
                  Allow group sessions
                </label>
              </div>

              {formData.allowGroupSessions && (
                <div>
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

            {providerType._count && providerType._count.providers > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This provider type is currently assigned to{' '}
                  <strong>{providerType._count.providers}</strong> provider(s). Changes will
                  affect all existing providers of this type.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/admin/${tenantSlug}/provider-types`}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
