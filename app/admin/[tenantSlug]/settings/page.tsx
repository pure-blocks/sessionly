'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  website: string | null
  description: string | null
  primaryColor: string | null
  secondaryColor: string | null
  logoUrl: string | null
  timezone: string
  currency: string
}

export default function SettingsPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    timezone: 'UTC',
    currency: 'USD',
  })

  useEffect(() => {
    fetchTenant()
  }, [tenantSlug])

  const fetchTenant = async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/tenant`)
      const data = await res.json()

      if (data.tenant) {
        setTenant(data.tenant)
        setFormData({
          name: data.tenant.name || '',
          email: data.tenant.email || '',
          phone: data.tenant.phone || '',
          website: data.tenant.website || '',
          description: data.tenant.description || '',
          primaryColor: data.tenant.primaryColor || '#3B82F6',
          secondaryColor: data.tenant.secondaryColor || '#10B981',
          timezone: data.tenant.timezone || 'UTC',
          currency: data.tenant.currency || 'USD',
        })
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/${tenantSlug}/tenant`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        alert('Settings saved successfully!')
        fetchTenant()
      } else {
        const error = await res.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <Link
              href={`/admin/${tenantSlug}`}
              className="text-blue-600 hover:underline text-sm mb-2 block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your organization settings
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                  placeholder="Brief description of your organization..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Branding</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Primary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Secondary Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600 mb-2">Color Preview:</p>
                <div className="flex gap-2">
                  <div
                    style={{ backgroundColor: formData.primaryColor }}
                    className="h-12 flex-1 rounded flex items-center justify-center text-white font-semibold"
                  >
                    Primary
                  </div>
                  <div
                    style={{ backgroundColor: formData.secondaryColor }}
                    className="h-12 flex-1 rounded flex items-center justify-center text-white font-semibold"
                  >
                    Secondary
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Localization */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Localization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData({ ...formData, timezone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Australia/Sydney">Sydney</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          {tenant && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-2">Tenant Information</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><span className="font-medium">Slug:</span> {tenant.slug}</p>
                <p><span className="font-medium">Public URL:</span> <code>/{tenant.slug}/book</code></p>
                <p><span className="font-medium">Admin URL:</span> <code>/admin/{tenant.slug}</code></p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <Link
              href={`/admin/${tenantSlug}`}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
