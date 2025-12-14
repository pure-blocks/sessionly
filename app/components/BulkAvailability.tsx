'use client'

import { useState } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, eachDayOfInterval, isWeekend } from 'date-fns'
import 'react-day-picker/style.css'

interface TimeRange {
  startTime: string
  endTime: string
}

interface TimeSlot {
  startTime: string
  endTime: string
}

interface BulkAvailabilityProps {
  trainerId: string
  onSuccess: () => void
}

export default function BulkAvailability({ trainerId, onSuccess }: BulkAvailabilityProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [range, setRange] = useState<DateRange | undefined>()
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([{ startTime: '09:00', endTime: '17:00' }])
  const [useWeekdays, setUseWeekdays] = useState(false)
  const [isGroupSession, setIsGroupSession] = useState(false)
  const [maxCapacity, setMaxCapacity] = useState(1)
  const [price, setPrice] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingSlots, setExistingSlots] = useState<Set<string>>(new Set())
  const [checkingExisting, setCheckingExisting] = useState(false)

  const generateHourlySlots = (startTime: string, endTime: string): TimeSlot[] => {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const slots: TimeSlot[] = []
    let currentHour = startHours
    let currentMinute = startMinutes

    while (currentHour < endHours || (currentHour === endHours && currentMinute < endMinutes)) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

      // Add 1 hour
      currentMinute += 60
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60)
        currentMinute = currentMinute % 60
      }

      const slotEnd = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

      // Only add if the slot end doesn't exceed the range end
      const slotEndMinutes = currentHour * 60 + currentMinute
      const rangeEndMinutes = endHours * 60 + endMinutes

      if (slotEndMinutes <= rangeEndMinutes) {
        slots.push({ startTime: slotStart, endTime: slotEnd })
      }
    }

    return slots
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

  const checkExistingSlots = async (dates: Date[]) => {
    if (dates.length === 0) {
      setExistingSlots(new Set())
      return
    }

    setCheckingExisting(true)
    try {
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'))
      const res = await fetch(`/api/availability?providerId=${trainerId}&dates=${dateStrings.join(',')}`)
      const data = await res.json()

      const existing = new Set<string>()
      if (Array.isArray(data)) {
        data.forEach((slot: { date: string; startTime: string; endTime: string }) => {
          const dateStr = format(new Date(slot.date), 'yyyy-MM-dd')
          const key = `${dateStr}_${slot.startTime}_${slot.endTime}`
          existing.add(key)
        })
      }
      setExistingSlots(existing)
    } catch (err) {
      console.error('Failed to check existing slots:', err)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    setRange(range)
    if (range?.from && range?.to) {
      let dates = eachDayOfInterval({ start: range.from, end: range.to })
      if (useWeekdays) {
        dates = dates.filter(date => !isWeekend(date))
      }
      setSelectedDates(dates)
      checkExistingSlots(dates)
    } else if (range?.from) {
      setSelectedDates([range.from])
      checkExistingSlots([range.from])
    } else {
      setSelectedDates([])
      setExistingSlots(new Set())
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (selectedDates.length === 0) {
      setError('Please select at least one date')
      return
    }

    if (timeRanges.length === 0) {
      setError('Please add at least one time range')
      return
    }

    // Validate time ranges
    for (const range of timeRanges) {
      if (range.startTime >= range.endTime) {
        setError('End time must be after start time for all ranges')
        return
      }
    }

    // Generate hourly slots from time ranges
    const allTimeSlots: TimeSlot[] = []
    for (const range of timeRanges) {
      const slots = generateHourlySlots(range.startTime, range.endTime)
      allTimeSlots.push(...slots)
    }

    if (allTimeSlots.length === 0) {
      setError('No valid 1-hour slots can be created from the time ranges')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/availability/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          providerId: trainerId, // Support both for backwards compatibility
          dates: selectedDates.map(date => format(date, 'yyyy-MM-dd')),
          timeSlots: allTimeSlots,
          isGroupSession,
          maxCapacity: isGroupSession ? maxCapacity : 1,
          price: price || null
        })
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(`Successfully created ${data.count} availability slots!`)
        setSelectedDates([])
        setRange(undefined)
        setTimeRanges([{ startTime: '09:00', endTime: '17:00' }])
        onSuccess()
      } else {
        const error = await res.json()
        setError(error.error || 'Failed to create availability')
      }
    } catch (err) {
      setError('An error occurred while creating availability')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Bulk Add Availability
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-500 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-500 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calendar Selection */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={useWeekdays}
                onChange={(e) => {
                  setUseWeekdays(e.target.checked)
                  handleRangeSelect(range)
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
                selected={range}
                onSelect={handleRangeSelect}
                disabled={{ before: new Date() }}
                className="dark:text-white"
                modifiersClassNames={{
                  selected: 'bg-blue-600 text-white rounded-md',
                  today: 'font-bold text-blue-600 dark:text-blue-400'
                }}
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

          {/* Session Settings */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Session Settings</h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isGroupSession}
                    onChange={(e) => {
                      setIsGroupSession(e.target.checked)
                      if (!e.target.checked) setMaxCapacity(1)
                    }}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    👥 Allow Group Sessions
                  </span>
                </label>
              </div>

              {isGroupSession && (
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Price per Session (optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="Leave empty for default pricing"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="p-4 bg-white dark:bg-gray-700 rounded-lg">
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

                // Check which slots already exist
                const newSlots: string[] = []
                const duplicateSlots: string[] = []

                if (selectedDates.length > 0) {
                  generatedSlots.forEach(slot => {
                    const isNew = selectedDates.every(date => {
                      const dateStr = format(date, 'yyyy-MM-dd')
                      const key = `${dateStr}_${slot.startTime}_${slot.endTime}`
                      return !existingSlots.has(key)
                    })

                    if (isNew) {
                      newSlots.push(slot.startTime)
                    } else {
                      duplicateSlots.push(slot.startTime)
                    }
                  })
                }

                return (
                  <div key={index} className="space-y-2 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400">Start Time</label>
                        <input
                          type="time"
                          value={range.startTime}
                          onChange={(e) => {
                            handleTimeRangeChange(index, 'startTime', e.target.value)
                            if (selectedDates.length > 0) checkExistingSlots(selectedDates)
                          }}
                          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-600 dark:text-gray-400">End Time</label>
                        <input
                          type="time"
                          value={range.endTime}
                          onChange={(e) => {
                            handleTimeRangeChange(index, 'endTime', e.target.value)
                            if (selectedDates.length > 0) checkExistingSlots(selectedDates)
                          }}
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
                    {checkingExisting && (
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Checking existing slots...
                        </p>
                      </div>
                    )}
                    {!checkingExisting && generatedSlots.length > 0 && selectedDates.length > 0 && (
                      <div className="space-y-1">
                        {newSlots.length > 0 && (
                          <div className="p-2 bg-green-50 dark:bg-green-900 rounded">
                            <p className="text-xs text-green-800 dark:text-green-200">
                              ✓ Will create {newSlots.length} new slot{newSlots.length > 1 ? 's' : ''}: {newSlots.join(', ')}
                            </p>
                          </div>
                        )}
                        {duplicateSlots.length > 0 && (
                          <div className="p-2 bg-yellow-50 dark:bg-yellow-900 rounded">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              ⚠ {duplicateSlots.length} slot{duplicateSlots.length > 1 ? 's' : ''} already exist{duplicateSlots.length === 1 ? 's' : ''}: {duplicateSlots.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {!checkingExisting && generatedSlots.length > 0 && selectedDates.length === 0 && (
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
          {selectedDates.length > 0 && timeRanges.length > 0 && !checkingExisting && (() => {
            const totalSlots = timeRanges.reduce((sum, range) => {
              return sum + generateHourlySlots(range.startTime, range.endTime).length
            }, 0)

            // Calculate new vs duplicate slots
            let newSlotsCount = 0
            let duplicateSlotsCount = 0

            timeRanges.forEach(range => {
              const slots = generateHourlySlots(range.startTime, range.endTime)
              slots.forEach(slot => {
                const duplicateCount = selectedDates.filter(date => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const key = `${dateStr}_${slot.startTime}_${slot.endTime}`
                  return existingSlots.has(key)
                }).length

                const newCount = selectedDates.length - duplicateCount

                newSlotsCount += newCount
                duplicateSlotsCount += duplicateCount
              })
            })

            return (
              <div className="space-y-2">
                {newSlotsCount > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Will create <strong>{newSlotsCount}</strong> new 1-hour booking slot{newSlotsCount > 1 ? 's' : ''}
                      {selectedDates.length > 1 && ` across ${selectedDates.length} dates`}
                    </p>
                  </div>
                )}
                {duplicateSlotsCount > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠ <strong>{duplicateSlotsCount}</strong> slot{duplicateSlotsCount > 1 ? 's' : ''} already exist{duplicateSlotsCount === 1 ? 's' : ''} and will be skipped
                    </p>
                  </div>
                )}
                {newSlotsCount === 0 && duplicateSlotsCount > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠ All selected slots already exist. No new slots will be created.
                    </p>
                  </div>
                )}
              </div>
            )
          })()}

          <button
            type="submit"
            disabled={loading || selectedDates.length === 0}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Availability Slots'}
          </button>
        </form>
      </div>
    </div>
  )
}
