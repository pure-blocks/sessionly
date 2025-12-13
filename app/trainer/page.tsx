'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BulkAvailability from '../components/BulkAvailability'
import TrainerCalendar from '../components/TrainerCalendar'

interface Trainer {
  id: string
  name: string
  email: string
  bio?: string
}

interface Availability {
  id: string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
}

export default function TrainerPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<string>('')
  const [availability, setAvailability] = useState<Availability[]>([])
  const [newTrainer, setNewTrainer] = useState({ name: '', email: '', bio: '' })
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '09:00', endTime: '17:00' })
  const [showTrainerForm, setShowTrainerForm] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    fetchTrainers()
  }, [])

  useEffect(() => {
    if (selectedTrainer) {
      fetchAvailability(selectedTrainer)
    }
  }, [selectedTrainer])

  const fetchTrainers = async () => {
    const res = await fetch('/api/trainers')
    const data = await res.json()
    setTrainers(Array.isArray(data) ? data : [])
  }

  const fetchAvailability = async (trainerId: string) => {
    const res = await fetch(`/api/availability?trainerId=${trainerId}`)
    const data = await res.json()
    setAvailability(Array.isArray(data) ? data : [])
  }

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/trainers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrainer)
    })
    if (res.ok) {
      setNewTrainer({ name: '', email: '', bio: '' })
      setShowTrainerForm(false)
      fetchTrainers()
    }
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

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrainer) return

    // Generate hourly slots from the time range
    const slots = generateHourlySlots(newSlot.startTime, newSlot.endTime)

    if (slots.length === 0) {
      alert('No valid 1-hour slots can be created from this time range')
      return
    }

    // Create all slots for this date
    const promises = slots.map(slot =>
      fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: selectedTrainer,
          date: newSlot.date,
          ...slot
        })
      })
    )

    const results = await Promise.all(promises)
    const allSuccess = results.every(res => res.ok)

    if (allSuccess) {
      setNewSlot({ date: '', startTime: '09:00', endTime: '17:00' })
      fetchAvailability(selectedTrainer)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    const res = await fetch(`/api/availability/${slotId}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      fetchAvailability(selectedTrainer)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Trainer Portal
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Trainers
              </h2>
              <button
                onClick={() => setShowTrainerForm(!showTrainerForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {showTrainerForm ? 'Cancel' : 'Add Trainer'}
              </button>
            </div>

            {showTrainerForm && (
              <form onSubmit={handleCreateTrainer} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newTrainer.name}
                    onChange={(e) => setNewTrainer({ ...newTrainer, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-white"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newTrainer.email}
                    onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-white"
                    required
                  />
                  <textarea
                    placeholder="Bio (optional)"
                    value={newTrainer.bio}
                    onChange={(e) => setNewTrainer({ ...newTrainer, bio: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-600 dark:text-white"
                    rows={3}
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create Trainer
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {trainers.map((trainer) => (
                <div
                  key={trainer.id}
                  onClick={() => setSelectedTrainer(trainer.id)}
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Manage Availability
            </h2>

            {selectedTrainer ? (
              <TrainerCalendar trainerId={selectedTrainer} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Select a trainer to manage availability</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
