'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/app/components/UserMenu'

interface ProviderType {
  id: string
  name: string
  icon: string | null
}

interface Provider {
  id: string
  name: string
  email: string
  bio: string | null
  providerTypeId: string
  defaultHourlyRate: number | null
  profileImageUrl: string | null
}

export default function EditProviderPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string
  const providerId = params.id as string

  const [provider, setProvider] = useState<Provider | null>(null)
  const [providerTypes, setProviderTypes] = useState<ProviderType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    providerTypeId: '',
    defaultHourlyRate: '',
    profileImageUrl: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [providerRes, typesRes] = await Promise.all([
        fetch(`/api/${tenantSlug}/providers/${providerId}`),
        fetch(`/api/${tenantSlug}/provider-types`),
      ])

      const providerData = await providerRes.json()
      const typesData = await typesRes.json()

      if (providerData.provider) {
        setProvider(providerData.provider)
        setFormData({
          name: providerData.provider.name || '',
          email: providerData.provider.email || '',
          bio: providerData.provider.bio || '',
          providerTypeId: providerData.provider.providerTypeId || '',
          defaultHourlyRate: providerData.provider.defaultHourlyRate?.toString() || '',
          profileImageUrl: providerData.provider.profileImageUrl || '',
        })
      }

      setProviderTypes(typesData.providerTypes || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug, providerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/providers/${providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          bio: formData.bio || null,
          providerTypeId: formData.providerTypeId,
          defaultHourlyRate: formData.defaultHourlyRate
            ? parseFloat(formData.defaultHourlyRate)
            : null,
          profileImageUrl: formData.profileImageUrl || null,
        }),
      })

      if (res.ok) {
        alert('Provider updated successfully!')
        router.push(`/admin/${tenantSlug}/providers`)
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update provider:', error)
      alert('Failed to update provider')
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

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Provider not found</p>
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
                href={`/admin/${tenantSlug}/providers`}
                className="text-blue-600 hover:underline text-sm mb-2 block"
              >
                ← Back to Providers
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Provider
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Update provider information and settings
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
            </div>

            <div>
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
                <option value="">Select a provider type</option>
                {providerTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The category/type of service this provider offers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Profile Image URL
              </label>
              <input
                type="url"
                value={formData.profileImageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, profileImageUrl: e.target.value })
                }
                placeholder="https://example.com/photo.jpg"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Direct URL to profile photo
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={4}
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
                This will be used as the default price for this provider&apos;s availability slots
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/admin/${tenantSlug}/providers`}
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
