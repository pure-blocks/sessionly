'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  partySize: number
  status: string
  totalPrice: number | null
  notes: string | null
  createdAt: string
  provider: {
    id: string
    name: string
  }
  availability: {
    date: string
    startTime: string
    endTime: string
  }
}

export default function BookingsPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const fetchBookings = useCallback(async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/bookings`)
      const data = await res.json()
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/${tenantSlug}/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        fetchBookings()
      }
    } catch (error) {
      console.error('Failed to update booking:', error)
    }
  }

  const filteredBookings =
    filter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === filter)

  const statusCounts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
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
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage all bookings
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All', color: 'bg-gray-100' },
              { key: 'confirmed', label: 'Confirmed', color: 'bg-green-100' },
              { key: 'pending', label: 'Pending', color: 'bg-yellow-100' },
              { key: 'completed', label: 'Completed', color: 'bg-blue-100' },
              { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100' },
            ].map((status) => (
              <button
                key={status.key}
                onClick={() => setFilter(status.key)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  filter === status.key
                    ? 'bg-blue-600 text-white'
                    : `${status.color} hover:opacity-80`
                }`}
              >
                {status.label} ({statusCounts[status.key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">All Bookings</h2>
          </div>
          <div className="p-6">
            {loading ? (
              <p className="text-center text-gray-500 py-8">Loading...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {bookings.length === 0
                  ? 'No bookings yet.'
                  : 'No bookings found for this filter.'}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">
                            {booking.clientName}
                          </h3>
                          <select
                            value={booking.status}
                            onChange={(e) =>
                              updateBookingStatus(booking.id, e.target.value)
                            }
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : booking.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Email:</span>{' '}
                              {booking.clientEmail}
                            </p>
                            {booking.clientPhone && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Phone:</span>{' '}
                                {booking.clientPhone}
                              </p>
                            )}
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Party Size:</span>{' '}
                              {booking.partySize}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Provider:</span>{' '}
                              {booking.provider.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(booking.availability.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Time:</span>{' '}
                              {booking.availability.startTime} -{' '}
                              {booking.availability.endTime}
                            </p>
                          </div>
                        </div>

                        {booking.totalPrice && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Total Price:</span> $
                            {booking.totalPrice.toFixed(2)}
                          </p>
                        )}

                        {booking.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm font-medium text-gray-700">
                              Notes:
                            </p>
                            <p className="text-sm text-gray-600">
                              {booking.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <p>
                          Booked{' '}
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
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
