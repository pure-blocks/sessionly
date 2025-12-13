'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isToday, eachDayOfInterval as eachDay, isWeekend } from 'date-fns'
import { DayPicker, DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'

interface Availability {
  id: string
  date: string
  startTime: string
  endTime: string
  isGroupSession: boolean
  maxCapacity: number
  currentBookings: number
  price: number | null
}

interface Booking {
  id: string
  clientName: string
  clientEmail: string
  partySize: number
  availability: Availability
}

interface TrainerCalendarProps {
  trainerId: string
}

interface TimeRange {
  startTime: string
  endTime: string
}

export default function TrainerCalendar({ trainerId }: TrainerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Availability[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAddSlotModal, setShowAddSlotModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>({ startTime: '09:00', endTime: '17:00' })

  // Bulk add states
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ startTime: '09:00', endTime: '17:00' }])
  const [useWeekdays, setUseWeekdays] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [trainerId, currentDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [availRes, bookingsRes] = await Promise.all([
        fetch(`/api/availability?trainerId=${trainerId}`),
        fetch(`/api/bookings?trainerId=${trainerId}`)
      ])

      const availData = await availRes.json()
      const bookingsData = await bookingsRes.json()

      setAvailability(Array.isArray(availData) ? availData : [])
      setBookings(Array.isArray(bookingsData) ? bookingsData : [])
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
  }

  const generateHourlySlots = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const slots = []
    let currentHour = startHours
    let currentMinute = startMinutes

    while (currentHour < endHours || (currentHour === endHours && currentMinute < endMinutes)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

      currentMinute += 60
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60)
        currentMinute = currentMinute % 60
      }

      const slotEnd = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      const slotEndMinutes = currentHour * 60 + currentMinute
      const rangeEndMinutes = endHours * 60 + endMinutes

      if (slotEndMinutes <= rangeEndMinutes) {
        slots.push({ startTime: slotStart, endTime: slotEnd })
      }
    }
    return slots
  }

  const handleAddSlots = async () => {
    if (!selectedDate) return

    const slots = generateHourlySlots(timeRange.startTime, timeRange.endTime)

    try {
      const res = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          dates: [format(selectedDate, 'yyyy-MM-dd')],
          timeSlots: slots
        })
      })

      if (res.ok) {
        setShowAddSlotModal(false)
        setSelectedDate(null)
        setTimeRange({ startTime: '09:00', endTime: '17:00' })
        fetchData()
      }
    } catch (error) {
      console.error('Error adding slots:', error)
    }
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to) {
      let dates = eachDayOfInterval({ start: range.from, end: range.to })
      if (useWeekdays) {
        dates = dates.filter(date => !isWeekend(date))
      }
      setSelectedDates(dates)
    } else if (range?.from) {
      setSelectedDates([range.from])
    } else {
      setSelectedDates([])
    }
  }

  const handleBulkSubmit = async () => {
    if (selectedDates.length === 0) {
      alert('Please select at least one date')
      return
    }

    // Validate time ranges
    for (const range of timeRanges) {
      if (range.startTime >= range.endTime) {
        alert('End time must be after start time for all ranges')
        return
      }
    }

    // Generate hourly slots from time ranges
    const allTimeSlots: TimeRange[] = []
    for (const range of timeRanges) {
      const slots = generateHourlySlots(range.startTime, range.endTime)
      allTimeSlots.push(...slots)
    }

    if (allTimeSlots.length === 0) {
      alert('No valid 1-hour slots can be created from the time ranges')
      return
    }

    setBulkLoading(true)

    try {
      const res = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          dates: selectedDates.map(date => format(date, 'yyyy-MM-dd')),
          timeSlots: allTimeSlots
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShowBulkModal(false)
        setSelectedDates([])
        setDateRange(undefined)
        setTimeRanges([{ startTime: '09:00', endTime: '17:00' }])
        setUseWeekdays(false)
        fetchData()

        // Show success message with duplicate info
        if (data.skipped > 0) {
          alert(`Successfully created ${data.count} slots. ${data.skipped} duplicate slots were skipped.`)
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create availability')
      }
    } catch (err) {
      alert('An error occurred while creating availability')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleAddTimeRange = () => {
    setTimeRanges([...timeRanges, { startTime: '09:00', endTime: '17:00' }])
  }

  const handleRemoveTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index))
  }

  const handleTimeRangeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newRanges = [...timeRanges]
    newRanges[index][field] = value
    setTimeRanges(newRanges)
  }

  const getAvailabilityForDate = (date: Date) => {
    return availability.filter(slot => {
      const slotDate = new Date(slot.date)
      return isSameDay(slotDate, date)
    })
  }

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.availability.date)
      return isSameDay(bookingDate, date)
    })
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-bold text-gray-700 dark:text-gray-300 py-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayAvailability = getAvailabilityForDate(day)
          const dayBookings = getBookingsForDate(day)
          const totalSlots = dayAvailability.length

          // Calculate slots with bookings vs total slots
          const slotsWithBookings = dayAvailability.filter(slot => slot.currentBookings > 0).length
          const totalPeople = dayAvailability.reduce((sum, slot) => sum + slot.currentBookings, 0)

          const isCurrentMonth = isSameMonth(day, currentDate)
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                if (isCurrentMonth) {
                  setSelectedDate(day)
                  setShowAddSlotModal(true)
                }
              }}
              className={`min-h-[100px] p-2 border rounded-lg transition-all ${
                !isCurrentMonth ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : 'bg-white dark:bg-gray-700'
              } ${isToday(day) ? 'ring-2 ring-blue-500' : ''} ${
                isCurrentMonth ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-600' : 'cursor-default'
              }`}
            >
              <div className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {totalSlots > 0 ? (
                  <>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {totalSlots} slot{totalSlots > 1 ? 's' : ''}
                    </div>
                    <div className={`text-xs font-medium ${
                      slotsWithBookings === 0
                        ? 'text-gray-500 dark:text-gray-400'
                        : slotsWithBookings === totalSlots
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {slotsWithBookings}/{totalSlots} booked{totalPeople > 0 ? ` (${totalPeople} people)` : ''}
                    </div>
                  </>
                ) : !isPast && isCurrentMonth ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Click to add
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }


  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
          >
            + Bulk Add
          </button>
          <button
            onClick={() => navigate('prev')}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          renderMonthView()
        )}
      </div>

      {/* Add/Manage Slot Modal */}
      {showAddSlotModal && selectedDate && (() => {
        const existingSlots = getAvailabilityForDate(selectedDate)
        const isPast = selectedDate < new Date(new Date().setHours(0, 0, 0, 0))

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 my-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {format(selectedDate, 'MMMM d, yyyy')}
              </h3>

              {/* Existing Slots */}
              {existingSlots.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">Existing Slots</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {existingSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex justify-between items-center p-3 rounded-lg ${
                          slot.currentBookings > 0
                            ? 'bg-yellow-50 dark:bg-yellow-900'
                            : 'bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {slot.startTime} - {slot.endTime}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {slot.currentBookings}/{slot.maxCapacity} booked
                          </p>
                        </div>
                        {slot.currentBookings === 0 && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (confirm('Delete this slot?')) {
                                try {
                                  const res = await fetch(`/api/availability/${slot.id}`, {
                                    method: 'DELETE'
                                  })
                                  if (res.ok) {
                                    await fetchData()
                                  } else {
                                    const error = await res.json()
                                    alert(error.error || 'Failed to delete slot')
                                  }
                                } catch (error) {
                                  console.error('Error deleting slot:', error)
                                  alert('Failed to delete slot')
                                }
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Slots */}
              {!isPast && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white">Add New Slots</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={timeRange.startTime}
                      onChange={(e) => setTimeRange({ ...timeRange, startTime: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={timeRange.endTime}
                      onChange={(e) => setTimeRange({ ...timeRange, endTime: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {timeRange.startTime && timeRange.endTime && (() => {
                    const slots = generateHourlySlots(timeRange.startTime, timeRange.endTime)
                    return slots.length > 0 ? (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          Will create {slots.length} slot{slots.length > 1 ? 's' : ''}: {slots.map(s => s.startTime).join(', ')}
                        </p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => {
                    setShowAddSlotModal(false)
                    setSelectedDate(null)
                    setTimeRange({ startTime: '09:00', endTime: '17:00' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
                {!isPast && (
                  <button
                    onClick={handleAddSlots}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Slots
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Bulk Add Availability
            </h3>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Calendar Selection */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <label className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={useWeekdays}
                    onChange={(e) => {
                      setUseWeekdays(e.target.checked)
                      handleRangeSelect(dateRange)
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Weekdays only (exclude weekends)
                  </span>
                </label>

                <div className="flex justify-center">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={handleRangeSelect}
                    disabled={{ before: new Date() }}
                    className="dark:text-white"
                  />
                </div>

                {selectedDates.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Selected {selectedDates.length} date(s)
                    </p>
                  </div>
                )}
              </div>

              {/* Working Hours */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white">Working Hours</h4>
                  <button
                    type="button"
                    onClick={handleAddTimeRange}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    + Add Range
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Set your working hours. The system will automatically create 1-hour booking slots.
                </p>

                <div className="space-y-4">
                  {timeRanges.map((range, index) => {
                    const generatedSlots = generateHourlySlots(range.startTime, range.endTime)
                    return (
                      <div key={index} className="space-y-2 p-3 bg-white dark:bg-gray-600 rounded-lg">
                        <div className="flex gap-3 items-center">
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400">Start Time</label>
                            <input
                              type="time"
                              value={range.startTime}
                              onChange={(e) => handleTimeRangeChange(index, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400">End Time</label>
                            <input
                              type="time"
                              value={range.endTime}
                              onChange={(e) => handleTimeRangeChange(index, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          {timeRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTimeRange(index)}
                              className="mt-5 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {generatedSlots.length > 0 && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-900 rounded">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                              Will create {generatedSlots.length} slot{generatedSlots.length > 1 ? 's' : ''}: {generatedSlots.map(s => s.startTime).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Summary */}
              {selectedDates.length > 0 && timeRanges.length > 0 && (() => {
                const totalSlots = timeRanges.reduce((sum, range) => {
                  return sum + generateHourlySlots(range.startTime, range.endTime).length
                }, 0)
                const totalAvailability = selectedDates.length * totalSlots
                return totalAvailability > 0 ? (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      This will create <strong>{totalAvailability}</strong> 1-hour booking slots
                      ({selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} × {totalSlots} slot{totalSlots > 1 ? 's' : ''} per day)
                    </p>
                  </div>
                ) : null
              })()}
            </div>

            <div className="flex gap-3 pt-6">
              <button
                onClick={() => {
                  setShowBulkModal(false)
                  setSelectedDates([])
                  setDateRange(undefined)
                  setTimeRanges([{ startTime: '09:00', endTime: '17:00' }])
                  setUseWeekdays(false)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkLoading || selectedDates.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {bulkLoading ? 'Creating...' : 'Create Availability Slots'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
