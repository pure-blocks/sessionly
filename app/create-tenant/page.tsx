'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface TenantSuccess {
  tenant: {
    id: string
    slug: string
    name: string
  }
  adminUrl: string
  bookingUrl: string
  slug: string
}

export default function CreateTenantPage() {
  const { data: session } = useSession()

  // Detect user's timezone (client-side only, after mount)
  const [detectedTimezone, setDetectedTimezone] = useState('UTC')

  const [formData, setFormData] = useState({
    invitationCode: '',
    name: '',
    email: '',
    slug: '',
    description: '',
    phone: '',
    website: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    timezone: 'UTC',
    currency: 'USD',
    // Provider type fields
    providerTypeName: '',
    providerTypeNameSingular: '',
    providerTypeDescription: '',
  })

  // Detect timezone after component mounts (client-side only)
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTimezone(timezone)
    setFormData(prev => ({ ...prev, timezone }))
  }, [])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<TenantSuccess | null>(null)

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create tenant')
        setLoading(false)
        return
      }

      setSuccess(data)

      // If user is logged in, update their account to be admin of this tenant
      if (session?.user?.email) {
        await fetch('/api/auth/update-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: data.tenant.id }),
        }).catch(() => {
          // Silently fail - tenant is created, user can still access it
        })
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Organization Created Successfully!
            </h2>

            <p className="text-gray-600 mb-6">
              Your organization <span className="font-semibold">{success.tenant.name}</span> has been created.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">Quick Links:</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-blue-700 font-medium">Admin Dashboard:</span>{' '}
                  <a href={success.adminUrl} className="text-blue-600 hover:underline">
                    {success.adminUrl}
                  </a>
                </p>
                <p>
                  <span className="text-blue-700 font-medium">Booking Page:</span>{' '}
                  <a href={success.bookingUrl} className="text-blue-600 hover:underline">
                    {success.bookingUrl}
                  </a>
                </p>
                <p>
                  <span className="text-blue-700 font-medium">Organization Slug:</span>{' '}
                  <code className="bg-blue-100 px-2 py-1 rounded">{success.slug}</code>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={success.adminUrl}
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Go to Admin Dashboard
              </Link>
              <Link
                href="/"
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Organization
          </h1>
          <p className="text-lg text-gray-600">
            Set up your booking platform in minutes
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Invitation Code */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Code *
              </label>
              <input
                type="text"
                required
                value={formData.invitationCode}
                onChange={(e) => setFormData({ ...formData, invitationCode: e.target.value.toUpperCase() })}
                placeholder="Enter your invitation code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                maxLength={16}
              />
              <p className="text-xs text-gray-600 mt-1">
                You need an invitation code to create an organization. Contact an administrator to get one.
              </p>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                Basic Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Acme Fitness Studio"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug *
                  </label>
                  <div className="flex items-center">
                    <span className="bg-gray-100 px-4 py-3 rounded-l-lg border border-r-0 border-gray-300 text-gray-600">
                      yoursite.com/
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="acme-fitness"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your unique URL identifier
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@acme.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Brief description of your organization..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://acme.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Type */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                Service Provider Type
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider Type Name (Plural) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.providerTypeName}
                    onChange={(e) => setFormData({
                      ...formData,
                      providerTypeName: e.target.value,
                      providerTypeNameSingular: e.target.value.replace(/s$/, '') // Simple singularization
                    })}
                    placeholder="Trainers, Coaches, Therapists, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g., &quot;Trainers&quot;, &quot;Coaches&quot;, &quot;Therapists&quot;
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider Type Name (Singular) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.providerTypeNameSingular}
                    onChange={(e) => setFormData({ ...formData, providerTypeNameSingular: e.target.value })}
                    placeholder="Trainer, Coach, Therapist, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider Type Description
                  </label>
                  <textarea
                    value={formData.providerTypeDescription}
                    onChange={(e) => setFormData({ ...formData, providerTypeDescription: e.target.value })}
                    rows={2}
                    placeholder="Description of this provider type..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
                Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UTC">UTC</option>

                    <optgroup label="North America">
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Phoenix">Arizona (MST)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Anchorage">Alaska (AKT)</option>
                      <option value="Pacific/Honolulu">Hawaii (HST)</option>
                      <option value="America/Toronto">Toronto</option>
                      <option value="America/Vancouver">Vancouver</option>
                    </optgroup>

                    <optgroup label="Europe">
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Europe/Berlin">Berlin (CET)</option>
                      <option value="Europe/Rome">Rome (CET)</option>
                      <option value="Europe/Madrid">Madrid (CET)</option>
                      <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                      <option value="Europe/Brussels">Brussels (CET)</option>
                      <option value="Europe/Vienna">Vienna (CET)</option>
                      <option value="Europe/Stockholm">Stockholm (CET)</option>
                      <option value="Europe/Athens">Athens (EET)</option>
                      <option value="Europe/Istanbul">Istanbul (TRT)</option>
                      <option value="Europe/Moscow">Moscow (MSK)</option>
                    </optgroup>

                    <optgroup label="Asia">
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Seoul">Seoul (KST)</option>
                      <option value="Asia/Bangkok">Bangkok (ICT)</option>
                      <option value="Asia/Jakarta">Jakarta (WIB)</option>
                    </optgroup>

                    <optgroup label="Australia & Pacific">
                      <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                      <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                      <option value="Australia/Brisbane">Brisbane (AEST)</option>
                      <option value="Australia/Perth">Perth (AWST)</option>
                      <option value="Australia/Adelaide">Adelaide (ACDT/ACST)</option>
                      <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                    </optgroup>

                    <optgroup label="South America">
                      <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                      <option value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</option>
                      <option value="America/Santiago">Santiago (CLT)</option>
                      <option value="America/Lima">Lima (PET)</option>
                    </optgroup>

                    <optgroup label="Africa">
                      <option value="Africa/Cairo">Cairo (EET)</option>
                      <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                      <option value="Africa/Lagos">Lagos (WAT)</option>
                      <option value="Africa/Nairobi">Nairobi (EAT)</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Detected: {detectedTimezone}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {loading ? 'Creating Organization...' : 'Create Organization'}
              </button>
              <Link
                href="/"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
