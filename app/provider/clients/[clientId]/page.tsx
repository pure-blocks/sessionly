'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface ClientDetail {
  id: string
  name: string
  email: string
  phone: string | null
  notes: string | null
  customHourlyRate: number | null
  customPricingNotes: string | null
  inviteAcceptedAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  } | null
  bookings: Array<{
    id: string
    availability: {
      date: string
      startTime: string
      endTime: string
    }
    status: string
    totalPrice: number | null
    createdAt: string
  }>
}

export default function ClientDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    customHourlyRate: '',
    customPricingNotes: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && clientId) {
      fetchClient()
    }
  }, [status, clientId])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch client')
        setLoading(false)
        return
      }

      setClient(data.client)
      setFormData({
        name: data.client.name,
        phone: data.client.phone || '',
        notes: data.client.notes || '',
        customHourlyRate: data.client.customHourlyRate?.toString() || '',
        customPricingNotes: data.client.customPricingNotes || '',
      })
      setLoading(false)
    } catch (err) {
      setError('Failed to load client')
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          notes: formData.notes || null,
          customHourlyRate: formData.customHourlyRate ? parseFloat(formData.customHourlyRate) : null,
          customPricingNotes: formData.customPricingNotes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update client')
        setSaving(false)
        return
      }

      setEditing(false)
      setSaving(false)
      fetchClient()
    } catch (err) {
      setError('An error occurred')
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this client?')) {
      return
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        alert('Failed to deactivate client')
        return
      }

      router.push('/provider/clients')
    } catch (err) {
      alert('An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Link
            href="/provider/clients"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  if (!client) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/provider/clients"
            className="text-blue-600 hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Clients
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-gray-600">{client.email}</p>
            </div>
            <div className="flex gap-2">
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeactivate}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    Deactivate
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                  </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h2>

              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.customHourlyRate}
                      onChange={(e) => setFormData({ ...formData, customHourlyRate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pricing Notes
                    </label>
                    <input
                      type="text"
                      value={formData.customPricingNotes}
                      onChange={(e) => setFormData({ ...formData, customPricingNotes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {client.phone && (
                    <div>
                      <div className="text-sm text-gray-500">Phone</div>
                      <div className="text-gray-900">{client.phone}</div>
                    </div>
                  )}
                  {client.customHourlyRate && (
                    <div>
                      <div className="text-sm text-gray-500">Custom Rate</div>
                      <div className="text-lg font-semibold text-green-600">
                        ${client.customHourlyRate}/hr
                      </div>
                      {client.customPricingNotes && (
                        <div className="text-sm text-gray-600 mt-1">
                          {client.customPricingNotes}
                        </div>
                      )}
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <div className="text-sm text-gray-500">Notes</div>
                      <div className="text-gray-900 whitespace-pre-wrap">{client.notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Booking History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Booking History ({client.bookings.length})
              </h2>

              {client.bookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No bookings yet</p>
              ) : (
                <div className="space-y-3">
                  {client.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {new Date(booking.availability.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {booking.availability.startTime} - {booking.availability.endTime}
                          </div>
                        </div>
                        <div className="text-right">
                          {booking.totalPrice && (
                            <div className="font-medium text-gray-900">
                              ${booking.totalPrice}
                            </div>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Account Status</h3>
              {client.inviteAcceptedAt ? (
                <div>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                    ✓ Active Account
                  </span>
                  <div className="mt-3 text-sm text-gray-600">
                    Joined {new Date(client.inviteAcceptedAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                    ⏳ Pending Invitation
                  </span>
                  <div className="mt-3 text-sm text-gray-600">
                    Invitation sent {new Date(client.createdAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-medium">{client.bookings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client Since</span>
                  <span className="font-medium">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
