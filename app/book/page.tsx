'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Trainer {
  id: string
  name: string
  email: string
  bio?: string
}

interface Booking {
  id: string
  partySize: number
  openToSharing: boolean
  pricePerPerson: number | null
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
  trainer: Trainer
  bookings: Booking[]
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  return endTotalMinutes - startTotalMinutes
}

function getAdjustedPricing(slot: Availability, partySize: number) {
  const spotsLeft = slot.maxCapacity - slot.currentBookings
  const totalPeople = slot.currentBookings + partySize

  // Base session price (total for the slot)
  const basePrice = 110 // Full group price

  // Calculate price per person based on total people in session
  const pricePerPerson = basePrice / totalPeople
  const totalForThisBooking = pricePerPerson * partySize

  return {
    pricePerPerson: Math.ceil(pricePerPerson * 100) / 100, // Round up to nearest cent
    totalForThisBooking: Math.ceil(totalForThisBooking * 100) / 100,
    totalPeople,
    spotsLeft
  }
}

export default function BookPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [sessionType, setSessionType] = useState<'single' | 'couple' | 'group'>('single')
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientEmail: '',
    notes: '',
    partySize: 1,
    openToSharing: false
  })
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [error, setError] = useState('')

  const getPricing = () => {
    switch (sessionType) {
      case 'single': return { price: 50, capacity: 1, label: 'Single ($50)' }
      case 'couple': return { price: 70, capacity: 2, label: 'Couple ($70)' }
      case 'group': return { price: 110, capacity: 4, label: 'Group - 4 people ($110)' }
    }
  }

  useEffect(() => {
    fetchTrainers()
  }, [])

  useEffect(() => {
    if (selectedTrainer && selectedDate) {
      fetchAvailability()
    }
  }, [selectedTrainer, selectedDate])

  const fetchTrainers = async () => {
    const res = await fetch('/api/trainers')
    const data = await res.json()
    setTrainers(Array.isArray(data) ? data : [])
  }

  const fetchAvailability = async () => {
    const res = await fetch(
      `/api/availability?trainerId=${selectedTrainer}&date=${selectedDate}&available=true`
    )
    const data = await res.json()
    // Ensure data is an array
    setAvailableSlots(Array.isArray(data) ? data : [])
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedSlot) {
      setError('Please select a time slot')
      return
    }

    const slot = availableSlots.find(s => s.id === selectedSlot)
    if (!slot) {
      setError('This time slot is no longer available. Please select another slot.')
      setSelectedSlot('')
      fetchAvailability()
      return
    }

    const isSharedSession = slot.currentBookings > 0 && slot.bookings.some(b => b.openToSharing)

    let sessionPrice, pricePerPerson

    if (isSharedSession) {
      // Calculate adjusted pricing for shared session
      const adjustedPrice = getAdjustedPricing(slot, bookingForm.partySize)
      sessionPrice = adjustedPrice.totalForThisBooking
      pricePerPerson = adjustedPrice.pricePerPerson
    } else {
      // Use standard pricing
      const pricing = getPricing()
      sessionPrice = pricing.price
      pricePerPerson = pricing.price / bookingForm.partySize
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        availabilityId: selectedSlot,
        sessionType,
        sessionPrice,
        pricePerPerson,
        ...bookingForm
      })
    })

    if (res.ok) {
      setBookingSuccess(true)
      setBookingForm({ clientName: '', clientEmail: '', notes: '', partySize: 1, openToSharing: false })
      setSelectedSlot('')
      fetchAvailability()
    } else {
      const errorData = await res.json()
      const errorMessage = errorData.error || 'Failed to book session'
      setError(errorMessage)

      // If slot doesn't exist anymore, refresh the availability list
      if (res.status === 404 || errorMessage.includes('not found')) {
        setSelectedSlot('')
        fetchAvailability()
      }
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Book a Training Session
        </h1>

        {bookingSuccess && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 border border-green-500 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-bold">
              Booking successful! Check your email for confirmation.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-500 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Step 1: Select Trainer
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trainers.map((trainer) => (
              <div
                key={trainer.id}
                onClick={() => {
                  setSelectedTrainer(trainer.id)
                  setSelectedSlot('')
                  setBookingSuccess(false)
                }}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedTrainer === trainer.id
                    ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <h3 className="font-bold text-gray-900 dark:text-white">{trainer.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{trainer.email}</p>
                {trainer.bio && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{trainer.bio}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedTrainer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Step 2: Select Date
            </h2>
            <input
              type="date"
              value={selectedDate}
              min={getTodayDate()}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setSelectedSlot('')
                setBookingSuccess(false)
              }}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}

        {selectedTrainer && selectedDate && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Step 3: Select Session Type
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setSessionType('single')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  sessionType === 'single'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white">Single</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$50</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">1 person</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('couple')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  sessionType === 'couple'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white">Couple</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$70</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">2 people ($35/person)</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('group')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  sessionType === 'group'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-white">Group</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$110</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">4 people ($27.50/person)</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-6">
              {sessionType === 'group' && 'Share with others to reduce costs. If fewer people join, cost is split among participants.'}
              {sessionType === 'couple' && 'Fixed price for 2 people'}
              {sessionType === 'single' && 'Private 1-on-1 session'}
            </p>
          </div>
        )}

        {selectedTrainer && selectedDate && sessionType && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Step 4: Select Time Slot
            </h2>
            {availableSlots.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No available slots for this date. Please try another date.
              </p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {availableSlots.map((slot) => {
                  const duration = calculateDuration(slot.startTime, slot.endTime)
                  const hours = Math.floor(duration / 60)
                  const minutes = duration % 60
                  const pricing = getPricing()
                  const spotsLeft = slot.maxCapacity - slot.currentBookings
                  const hasEnoughCapacity = spotsLeft >= pricing.capacity
                  const isSharedSession = slot.currentBookings > 0 && slot.bookings.some(b => b.openToSharing)

                  return (
                    <div
                      key={slot.id}
                      onClick={() => {
                        if (hasEnoughCapacity) {
                          setSelectedSlot(slot.id)
                          setBookingSuccess(false)
                        }
                      }}
                      className={`p-4 rounded-lg transition-colors ${
                        !hasEnoughCapacity
                          ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800'
                          : selectedSlot === slot.id
                          ? 'bg-green-100 dark:bg-green-900 border-2 border-green-500 cursor-pointer'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                      }`}
                    >
                      <p className="font-bold text-gray-900 dark:text-white">
                        {slot.startTime} - {slot.endTime}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {hours > 0 && `${hours} hour${hours > 1 ? 's' : ''}`}
                        {minutes > 0 && ` ${minutes} min`}
                        {' '}session
                      </p>
                      {slot.isGroupSession && slot.maxCapacity > 1 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                          👥 Group session - up to {slot.maxCapacity} people can book
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} available
                      </p>
                      {isSharedSession && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          👥 Shared session ({slot.currentBookings} already booked)
                        </p>
                      )}
                      {!hasEnoughCapacity && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Not enough spots for {sessionType}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {selectedSlot && (() => {
          const slot = availableSlots.find(s => s.id === selectedSlot)
          if (!slot) return null

          const isSharedSession = slot.currentBookings > 0 && slot.bookings.some(b => b.openToSharing)
          const spotsLeft = slot.maxCapacity - slot.currentBookings

          // For shared sessions, they can only join with party sizes that fit
          const maxPartySize = isSharedSession ? spotsLeft : Math.min(spotsLeft, getPricing().capacity)

          return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Step 5: Your Information
              </h2>

              {isSharedSession && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-500 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">
                    👥 Joining a Shared Session
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {slot.currentBookings} {slot.currentBookings === 1 ? 'person has' : 'people have'} already booked this slot.
                    You can join and everyone&apos;s cost will be adjusted based on total participants.
                  </p>
                </div>
              )}

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={bookingForm.clientName}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, clientName: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={bookingForm.clientEmail}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, clientEmail: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Party Size Selection - shown for non-single sessions or shared sessions */}
                {(sessionType !== 'single' || isSharedSession) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Party Size *
                    </label>
                    <div className="space-y-2">
                      {Array.from({ length: maxPartySize }, (_, i) => i + 1).map(num => {
                        const adjustedPrice = isSharedSession
                          ? getAdjustedPricing(slot, num)
                          : null

                        return (
                          <label
                            key={num}
                            className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              bookingForm.partySize === num
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="partySize"
                                value={num}
                                checked={bookingForm.partySize === num}
                                onChange={(e) =>
                                  setBookingForm({ ...bookingForm, partySize: Number(e.target.value) })
                                }
                                className="mr-3"
                              />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {num} {num === 1 ? 'person' : 'people'}
                              </span>
                            </div>
                            {isSharedSession && adjustedPrice && (
                              <div className="text-right">
                                <p className="font-bold text-blue-600 dark:text-blue-400">
                                  ${adjustedPrice.totalForThisBooking}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  ${adjustedPrice.pricePerPerson}/person
                                </p>
                              </div>
                            )}
                          </label>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} available
                    </p>
                  </div>
                )}

                {/* Open to sharing - available for all session types when creating a new booking */}
                {!isSharedSession && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bookingForm.openToSharing}
                        onChange={(e) =>
                          setBookingForm({ ...bookingForm, openToSharing: e.target.checked })
                        }
                        className="mr-3 h-5 w-5 mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                          💰 Let others join to save money
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                          Allow others to join this session. When they join, costs are split among all participants.
                        </p>
                        <div className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-blue-300 dark:border-blue-600">
                          <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">💡 How it saves you money:</p>
                          <ul className="text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                            <li>
                              {sessionType === 'single' && 'If 1 more joins: Your cost drops to $27.50/person (save $22.50!)'}
                              {sessionType === 'couple' && 'If 2 more join: Your cost drops to $27.50/person (save $7.50 each!)'}
                              {sessionType === 'group' && 'Full group of 4: Everyone pays just $27.50/person'}
                            </li>
                            <li>Session stays private until someone joins</li>
                            <li>You control your availability - book when you want</li>
                          </ul>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Pricing Display */}
                {(() => {
                  if (isSharedSession) {
                    const adjustedPrice = getAdjustedPricing(slot, bookingForm.partySize)
                    return (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>Your Total: ${adjustedPrice.totalForThisBooking}</strong>
                          <span className="block text-xs mt-1">
                            ${adjustedPrice.pricePerPerson}/person × {bookingForm.partySize} {bookingForm.partySize === 1 ? 'person' : 'people'}
                          </span>
                          <span className="block text-xs mt-2 opacity-75">
                            Total in session: {adjustedPrice.totalPeople} people
                          </span>
                        </p>
                      </div>
                    )
                  } else {
                    const pricing = getPricing()
                    return (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>Total: ${pricing.price}</strong>
                          {bookingForm.partySize > 1 && (
                            <span> (${(pricing.price / bookingForm.partySize).toFixed(2)}/person)</span>
                          )}
                        </p>
                      </div>
                    )
                  }
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, notes: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    rows={4}
                    placeholder="Any specific goals or requirements for this session?"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
                >
                  Confirm Booking
                </button>
              </form>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
