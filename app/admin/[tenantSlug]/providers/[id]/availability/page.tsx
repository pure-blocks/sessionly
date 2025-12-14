'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns'
import SimplePricingConfig from '@/app/components/SimplePricingConfig'

interface PricingConfig {
  soloPrice: number
  dropRatePercent: number
  minPricePerPerson: number
  minSessionEarnings: number
}

interface Provider {
  id: string
  name: string
  email: string
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
  pricingRules: string | null
  isActive: boolean
}

interface TimeSlot {
  hour: number
  minute: number
  display: string
}

export default function ProviderAvailabilityPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const providerId = params.id as string

  const [provider, setProvider] = useState<Provider | null>(null)
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showSetWeeklyHours, setShowSetWeeklyHours] = useState(false)
  const [showPricingConfig, setShowPricingConfig] = useState(false)
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; time: string } | null>(null)
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlotForm, setNewSlotForm] = useState({
    isGroupSession: false,
    maxCapacity: 1,
    price: ''
  })

  // Time slots from 6 AM to 10 PM
  const timeSlots: TimeSlot[] = []
  for (let hour = 6; hour <= 22; hour++) {
    timeSlots.push({
      hour,
      minute: 0,
      display: `${hour.toString().padStart(2, '0')}:00`
    })
  }

  // Days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [providerRes, availabilityRes] = await Promise.all([
        fetch(`/api/${tenantSlug}/providers/${providerId}`),
        fetch(`/api/availability?providerId=${providerId}`),
      ])

      const providerData = await providerRes.json()
      const availabilityData = await availabilityRes.json()

      setProvider(providerData.provider)
      setAvailability(Array.isArray(availabilityData) ? availabilityData : [])

      // Load pricing configuration from provider's default pricing rules
      if (providerData.provider?.defaultPricingRules) {
        try {
          const rules = JSON.parse(providerData.provider.defaultPricingRules)
          if (rules.type === 'step-based') {
            setPricingConfig({
              soloPrice: rules.soloPrice,
              dropRatePercent: rules.dropRatePercent,
              minPricePerPerson: rules.minPricePerPerson,
              minSessionEarnings: rules.minSessionEarnings
            })
          }
        } catch (e) {
          console.error('Failed to parse pricing rules:', e)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug, providerId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getSlotsForDayAndTime = (day: Date, timeSlot: string): Availability[] => {
    return availability.filter((slot) => {
      const slotDate = parseISO(slot.date)
      return isSameDay(slotDate, day) && slot.startTime === timeSlot
    })
  }

  const handleSlotClick = (day: Date, time: string) => {
    const slots = getSlotsForDayAndTime(day, time)

    if (slots.length > 0) {
      // If slot exists, show edit/delete options
      setSelectedSlot({ day, time })
    } else {
      // If no slot, show add dialog and reset form
      setNewSlotForm({ isGroupSession: false, maxCapacity: 1, price: '' })
      setSelectedSlot({ day, time })
    }
  }

  const addSlot = async () => {
    if (!selectedSlot) return

    setAddingSlot(true)
    try {
      const endHour = parseInt(selectedSlot.time.split(':')[0]) + 1
      const endTime = `${endHour.toString().padStart(2, '0')}:00`

      const priceValue = newSlotForm.price ? parseFloat(newSlotForm.price) : null

      const res = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          dates: [format(selectedSlot.day, 'yyyy-MM-dd')],
          timeSlots: [{ startTime: selectedSlot.time, endTime }],
          isGroupSession: newSlotForm.isGroupSession,
          maxCapacity: newSlotForm.isGroupSession ? newSlotForm.maxCapacity : 1,
          price: priceValue,
          pricingRules: pricingConfig ? JSON.stringify({
            type: 'step-based',
            ...pricingConfig
          }) : null
        }),
      })

      if (res.ok) {
        await fetchData()
        setSelectedSlot(null)
        setNewSlotForm({ isGroupSession: false, maxCapacity: 1, price: '' })
      } else {
        alert('Failed to add slot')
      }
    } catch (error) {
      console.error('Failed to add:', error)
      alert('An error occurred')
    } finally {
      setAddingSlot(false)
    }
  }

  const deleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/availability/${slotId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchData()
        setSelectedSlot(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete slot')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('An error occurred')
    }
  }

  const toggleSlotActive = async (slotId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/availability/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to toggle:', error)
    }
  }

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
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
          <Link
            href={`/admin/${tenantSlug}/providers`}
            className="text-blue-600 hover:underline text-sm mb-2 block"
          >
            ← Back to Providers
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {provider.providerType.icon} {provider.name} - Availability
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Click on a time slot to add or edit availability
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Week Navigation and Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={goToPreviousWeek}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                ← Previous
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Today
              </button>
              <button
                onClick={goToNextWeek}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Next →
              </button>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPricingConfig(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Configure Pricing
              </button>
              <button
                onClick={() => setShowSetWeeklyHours(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Set Weekly Hours
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-6 items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>Inactive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-400 rounded"></div>
              <span>Group Session</span>
            </div>
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 bg-gray-100 border-r border-gray-300 p-3 text-left text-sm font-semibold text-gray-700 w-24">
                      Time
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toString()}
                        className="border-r border-gray-200 p-3 text-center min-w-[120px]"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {format(day, 'MMM d')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot) => (
                    <tr key={timeSlot.display} className="border-t border-gray-200">
                      <td className="sticky left-0 bg-gray-50 border-r border-gray-300 p-3 text-sm text-gray-700 font-medium">
                        {timeSlot.display}
                      </td>
                      {weekDays.map((day) => {
                        const slots = getSlotsForDayAndTime(day, timeSlot.display)
                        const hasSlots = slots.length > 0
                        const firstSlot = slots[0]
                        const isBooked = hasSlots && firstSlot.currentBookings > 0
                        const isInactive = hasSlots && !firstSlot.isActive
                        const isGroup = hasSlots && firstSlot.isGroupSession

                        return (
                          <td
                            key={`${day.toString()}-${timeSlot.display}`}
                            className="border-r border-gray-200 p-1 cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSlotClick(day, timeSlot.display)}
                          >
                            {hasSlots ? (
                              <div
                                className={`p-2 rounded text-xs ${
                                  isInactive
                                    ? 'bg-gray-300 text-gray-700'
                                    : isBooked
                                    ? 'bg-blue-400 text-white'
                                    : isGroup
                                    ? 'bg-purple-400 text-white'
                                    : 'bg-green-400 text-white'
                                }`}
                              >
                                <div className="font-semibold">
                                  {firstSlot.startTime} - {firstSlot.endTime}
                                </div>
                                {isBooked && (
                                  <div className="text-xs mt-1">
                                    {firstSlot.currentBookings}/{firstSlot.maxCapacity} booked
                                  </div>
                                )}
                                {isGroup && !isBooked && (
                                  <div className="text-xs mt-1">
                                    Group (max {firstSlot.maxCapacity})
                                  </div>
                                )}
                                {firstSlot.price && (
                                  <div className="text-xs mt-1">
                                    ${firstSlot.price}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-16 flex items-center justify-center text-gray-400 text-xs">
                                +
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Slot Dialog */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {format(selectedSlot.day, 'EEEE, MMMM d, yyyy')} at {selectedSlot.time}
            </h3>

            {(() => {
              const slots = getSlotsForDayAndTime(selectedSlot.day, selectedSlot.time)

              if (slots.length > 0) {
                const slot = slots[0]
                return (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p><strong>Time:</strong> {slot.startTime} - {slot.endTime}</p>
                      <p><strong>Type:</strong> {slot.isGroupSession ? 'Group Session' : 'Private Session'}</p>
                      {slot.isGroupSession && (
                        <p><strong>Capacity:</strong> {slot.currentBookings}/{slot.maxCapacity}</p>
                      )}
                      {slot.price && <p><strong>Price:</strong> ${slot.price}</p>}
                      <p><strong>Status:</strong> {slot.isActive ? 'Active' : 'Inactive'}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleSlotActive(slot.id, slot.isActive)}
                        className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        {slot.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this slot?')) {
                            deleteSlot(slot.id)
                          }
                        }}
                        disabled={slot.currentBookings > 0}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedSlot(null)}
                      className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                )
              } else {
                return (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Add availability for this time slot
                    </p>

                    {/* Session Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Session Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNewSlotForm({ ...newSlotForm, isGroupSession: false, maxCapacity: 1 })}
                          className={`flex-1 px-4 py-2 rounded border-2 ${
                            !newSlotForm.isGroupSession
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setNewSlotForm({ ...newSlotForm, isGroupSession: true, maxCapacity: 10 })}
                          className={`flex-1 px-4 py-2 rounded border-2 ${
                            newSlotForm.isGroupSession
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                          }`}
                        >
                          Group
                        </button>
                      </div>
                    </div>

                    {/* Max Capacity (only for group sessions) */}
                    {newSlotForm.isGroupSession && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Capacity
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="50"
                          value={newSlotForm.maxCapacity}
                          onChange={(e) => setNewSlotForm({ ...newSlotForm, maxCapacity: parseInt(e.target.value) || 2 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (optional)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newSlotForm.price}
                          onChange={(e) => setNewSlotForm({ ...newSlotForm, price: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty if pricing varies or is set elsewhere
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={addSlot}
                        disabled={addingSlot}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                      >
                        {addingSlot ? 'Adding...' : 'Add Slot'}
                      </button>
                      <button
                        onClick={() => setSelectedSlot(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }
            })()}
          </div>
        </div>
      )}

      {/* Configure Pricing Dialog */}
      {showPricingConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="my-8">
            <SimplePricingConfig
              initialConfig={pricingConfig}
              maxCapacity={20}
              onSave={async (config) => {
                setPricingConfig(config)
                // Save to provider's default pricing rules
                try {
                  await fetch(`/api/${tenantSlug}/providers/${providerId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      defaultPricingRules: JSON.stringify({
                        type: 'step-based',
                        ...config
                      })
                    })
                  })
                  setShowPricingConfig(false)
                  alert('Pricing configuration saved! It will be applied to new availability slots.')
                } catch (error) {
                  console.error('Failed to save pricing config:', error)
                  alert('Failed to save pricing configuration')
                }
              }}
              onCancel={() => setShowPricingConfig(false)}
            />
          </div>
        </div>
      )}

      {/* Set Weekly Hours Dialog */}
      {showSetWeeklyHours && (
        <SetWeeklyHoursDialog
          providerId={providerId}
          pricingConfig={pricingConfig}
          onClose={() => setShowSetWeeklyHours(false)}
          onSuccess={() => {
            setShowSetWeeklyHours(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

// Set Weekly Hours Dialog Component
function SetWeeklyHoursDialog({
  providerId,
  pricingConfig,
  onClose,
  onSuccess,
}: {
  providerId: string
  pricingConfig: PricingConfig | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [weekSchedule, setWeekSchedule] = useState({
    monday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    tuesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    wednesday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    thursday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    friday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '17:00' },
  })
  const [weeksToApply, setWeeksToApply] = useState(4)
  const [isGroupSession, setIsGroupSession] = useState(false)
  const [maxCapacity, setMaxCapacity] = useState(10)
  const [price, setPrice] = useState('')
  const [creating, setCreating] = useState(false)

  const applyWeeklyHours = async () => {
    setCreating(true)
    try {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
      const dates: string[] = []
      const timeSlots: { startTime: string; endTime: string }[] = []

      // Generate dates for the specified number of weeks
      for (let week = 0; week < weeksToApply; week++) {
        const weekStart = addWeeks(startDate, week)

        Object.entries(weekSchedule).forEach(([_, config], dayIndex) => {
          if (config.enabled) {
            const date = addDays(weekStart, dayIndex)
            const dateStr = format(date, 'yyyy-MM-dd')

            if (!dates.includes(dateStr)) {
              dates.push(dateStr)
            }
          }
        })
      }

      // Generate time slots for each enabled day
      const enabledDays = Object.values(weekSchedule).filter(d => d.enabled)
      if (enabledDays.length > 0) {
        const firstEnabled = enabledDays[0]
        const startHour = parseInt(firstEnabled.startTime.split(':')[0])
        const endHour = parseInt(firstEnabled.endTime.split(':')[0])

        for (let hour = startHour; hour < endHour; hour++) {
          timeSlots.push({
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          })
        }
      }

      if (dates.length === 0 || timeSlots.length === 0) {
        alert('Please select at least one day and time range')
        setCreating(false)
        return
      }

      const priceValue = price ? parseFloat(price) : null

      const res = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          dates,
          timeSlots,
          isGroupSession,
          maxCapacity: isGroupSession ? maxCapacity : 1,
          price: priceValue,
          pricingRules: pricingConfig ? JSON.stringify({
            type: 'step-based',
            ...pricingConfig
          }) : null
        }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        alert('Failed to set weekly hours')
      }
    } catch (error) {
      console.error('Failed to set weekly hours:', error)
      alert('An error occurred')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Set Weekly Hours</h3>

        <div className="space-y-4 mb-6">
          {Object.entries(weekSchedule).map(([day, config]) => (
            <div key={day} className="flex items-center gap-4">
              <label className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) =>
                    setWeekSchedule({
                      ...weekSchedule,
                      [day]: { ...config, enabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium capitalize">{day}</span>
              </label>

              {config.enabled && (
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) =>
                      setWeekSchedule({
                        ...weekSchedule,
                        [day]: { ...config, startTime: e.target.value },
                      })
                    }
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={config.endTime}
                    onChange={(e) =>
                      setWeekSchedule({
                        ...weekSchedule,
                        [day]: { ...config, endTime: e.target.value },
                      })
                    }
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Apply for how many weeks?</label>
            <input
              type="number"
              min="1"
              max="52"
              value={weeksToApply}
              onChange={(e) => setWeeksToApply(parseInt(e.target.value) || 1)}
              className="px-3 py-2 border rounded w-32"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isGroupSession}
                onChange={(e) => setIsGroupSession(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Group Sessions</span>
            </label>

            {isGroupSession && (
              <div className="flex items-center gap-2">
                <label className="text-sm">Max Capacity:</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 2)}
                  className="px-2 py-1 border rounded w-20 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Price per slot (optional)</label>
              <div className="relative w-48">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if pricing varies per slot
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyWeeklyHours}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : `Apply to Next ${weeksToApply} Weeks`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
