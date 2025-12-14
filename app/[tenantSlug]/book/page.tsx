'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'

interface Provider {
  id: string
  name: string
  email: string
  bio?: string
  defaultHourlyRate: number | null
  providerType: {
    name: string
    icon: string | null
  }
}

interface Availability {
  id: string
  date: string
  startTime: string
  endTime: string
  isGroupSession: boolean
  maxCapacity: number
  currentBookings: number
  price: number | null
  provider: Provider
}

export default function BookPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [step, setStep] = useState(1)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [availability, setAvailability] = useState<Availability[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null)
  const [sessionType, setSessionType] = useState<'private' | 'group'>('private')
  const [partySize, setPartySize] = useState<number>(1)
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i))

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/providers`)
      const data = await res.json()
      setProviders(data.providers || [])
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    }
  }, [tenantSlug])

  const fetchAvailability = useCallback(async () => {
    if (!selectedProvider) return

    try {
      const res = await fetch(`/api/availability?providerId=${selectedProvider.id}&available=true`)
      const data = await res.json()
      setAvailability(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    }
  }, [selectedProvider])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  useEffect(() => {
    if (selectedProvider) {
      fetchAvailability()
    }
  }, [selectedProvider, fetchAvailability])

  const getSlotsForDay = (day: Date): Availability[] => {
    return availability
      .filter((slot) => isSameDay(parseISO(slot.date), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const calculatePrice = () => {
    if (!selectedSlot) return 0

    // Use slot price if available, otherwise use provider's default hourly rate
    const hourlyRate = selectedSlot.price || selectedProvider?.defaultHourlyRate || 0

    // Calculate duration in hours
    const [startHours, startMinutes] = selectedSlot.startTime.split(':').map(Number)
    const [endHours, endMinutes] = selectedSlot.endTime.split(':').map(Number)
    const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
    const durationHours = durationMinutes / 60

    const basePrice = hourlyRate * durationHours

    if (sessionType === 'private') {
      // Private: base price per person
      return basePrice * partySize
    } else {
      // Group: shared pricing
      const totalPeople = selectedSlot.currentBookings + partySize
      const pricePerPerson = basePrice / totalPeople
      return pricePerPerson * partySize
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot) return

    setLoading(true)
    try {
      const res = await fetch(`/api/${tenantSlug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availabilityId: selectedSlot.id,
          clientName: bookingForm.clientName,
          clientEmail: bookingForm.clientEmail,
          clientPhone: bookingForm.clientPhone,
          notes: bookingForm.notes,
          partySize,
          openToSharing: sessionType === 'group',
          sessionPrice: calculatePrice(),
        }),
      })

      if (res.ok) {
        setBookingSuccess(true)
        setStep(5)
      } else {
        const errorData = await res.json()
        alert(errorData.error || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert('An error occurred while creating your booking')
    } finally {
      setLoading(false)
    }
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your appointment with {selectedProvider?.name} has been confirmed.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {selectedSlot && format(parseISO(selectedSlot.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Time:</strong> {selectedSlot?.startTime} - {selectedSlot?.endTime}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Party Size:</strong> {partySize}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Total:</strong> ${calculatePrice().toFixed(2)}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {bookingForm.clientEmail}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Book an Appointment</h1>
          <p className="text-gray-600">Select your provider and choose a time that works for you</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { num: 1, label: 'Provider' },
              { num: 2, label: 'Date & Time' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'Confirm' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline">
                  {s.label}
                </span>
                {idx < 3 && (
                  <div className="w-12 h-0.5 bg-gray-300 mx-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step 1: Select Provider */}
          {step === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select a Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSelectedProvider(provider)
                      setStep(2)
                    }}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition text-left"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-2xl text-white">
                        {provider.providerType?.icon || '👤'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{provider.name}</h3>
                        <p className="text-sm text-gray-600">{provider.providerType?.name}</p>
                      </div>
                    </div>
                    {provider.defaultHourlyRate && (
                      <div className="mb-2">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          ${provider.defaultHourlyRate}/hour
                        </span>
                      </div>
                    )}
                    {provider.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2">{provider.bio}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Date & Time */}
          {step === 2 && selectedProvider && (
            <div className="p-8">
              <button
                onClick={() => setStep(1)}
                className="text-blue-600 hover:underline mb-4 text-sm"
              >
                ← Change Provider
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-xl text-white">
                  {selectedProvider.providerType?.icon || '👤'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProvider.name}</h2>
                  <p className="text-sm text-gray-600">{selectedProvider.providerType?.name}</p>
                </div>
              </div>

              {/* Week Navigation */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, -7))}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  ← Previous
                </button>
                <span className="font-semibold text-gray-900">
                  {format(selectedWeekStart, 'MMM d')} - {format(addDays(selectedWeekStart, 6), 'MMM d, yyyy')}
                </span>
                <button
                  onClick={() => setSelectedWeekStart(addDays(selectedWeekStart, 7))}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Next →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {weekDays.map((day) => {
                  const slots = getSlotsForDay(day)
                  return (
                    <div key={day.toString()} className="border rounded-lg p-3">
                      <div className="text-center mb-3">
                        <div className="text-xs font-semibold text-gray-600">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {format(day, 'd')}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {slots.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center">No slots</p>
                        ) : (
                          slots.slice(0, 3).map((slot) => (
                            <button
                              key={slot.id}
                              onClick={() => {
                                setSelectedSlot(slot)
                                setStep(3)
                              }}
                              className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition"
                            >
                              {slot.startTime}
                            </button>
                          ))
                        )}
                        {slots.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">+{slots.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Session Details */}
          {step === 3 && selectedSlot && (
            <div className="p-8">
              <button
                onClick={() => setStep(2)}
                className="text-blue-600 hover:underline mb-4 text-sm"
              >
                ← Change Time
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Details</h2>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>{selectedProvider?.name}</strong> on{' '}
                  <strong>{format(parseISO(selectedSlot.date), 'EEEE, MMMM d')}</strong> at{' '}
                  <strong>{selectedSlot.startTime} - {selectedSlot.endTime}</strong>
                </p>
              </div>

              {/* Session Type */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Session Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSessionType('private')
                      setPartySize(1)
                    }}
                    className={`p-4 border-2 rounded-lg transition ${
                      sessionType === 'private'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🔒</div>
                    <div className="font-semibold text-gray-900">Private</div>
                    <div className="text-xs text-gray-600">Exclusive session</div>
                  </button>
                  <button
                    onClick={() => {
                      setSessionType('group')
                      setPartySize(1)
                    }}
                    className={`p-4 border-2 rounded-lg transition ${
                      sessionType === 'group'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-semibold text-gray-900">Group</div>
                    <div className="text-xs text-gray-600">Share with others</div>
                  </button>
                </div>
              </div>

              {/* Party Size */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Number of People
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPartySize(size)}
                      className={`py-3 rounded-lg font-semibold transition ${
                        partySize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total Price:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ${calculatePrice().toFixed(2)}
                  </span>
                </div>
                {sessionType === 'group' && (
                  <p className="text-xs text-gray-600 mt-2">
                    Price may decrease if others join this session
                  </p>
                )}
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continue to Details →
              </button>
            </div>
          )}

          {/* Step 4: Contact Information */}
          {step === 4 && (
            <div className="p-8">
              <button
                onClick={() => setStep(3)}
                className="text-blue-600 hover:underline mb-4 text-sm"
              >
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Information</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingForm.clientName}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, clientName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={bookingForm.clientEmail}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, clientEmail: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={bookingForm.clientPhone}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, clientPhone: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={bookingForm.notes}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special requests or information..."
                  />
                </div>
              </div>

              <button
                onClick={handleBooking}
                disabled={loading || !bookingForm.clientName || !bookingForm.clientEmail}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
