'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface DataStats {
  providers: number
  availability: number
  availabilityPast: number
  availabilityFuture: number
  availabilityEmpty: number
  bookings: number
  bookingsPast: number
  bookingsFuture: number
}

export default function AdminToolsPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string

  const [stats, setStats] = useState<DataStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchStats()
  }, [tenantSlug])

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/${tenantSlug}/stats`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async (type: string, confirm: string) => {
    if (!window.confirm(confirm)) return

    setProcessing(type)
    setMessage(null)

    try {
      const res = await fetch(`/api/${tenantSlug}/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
        fetchStats()
      } else {
        setMessage({ type: 'error', text: data.error || 'Cleanup failed' })
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      setMessage({ type: 'error', text: 'An error occurred during cleanup' })
    } finally {
      setProcessing(null)
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href={`/admin/${tenantSlug}`}
            className="text-blue-600 hover:underline text-sm mb-2 block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Admin Tools</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and clean your data
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Data Statistics */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Data Statistics</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Providers */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Providers</p>
              <p className="text-3xl font-bold text-blue-900">{stats?.providers || 0}</p>
            </div>

            {/* Availability */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Total Availability Slots</p>
              <p className="text-3xl font-bold text-purple-900">{stats?.availability || 0}</p>
              <div className="mt-2 text-xs text-purple-700 space-y-1">
                <p>Past: {stats?.availabilityPast || 0}</p>
                <p>Future: {stats?.availabilityFuture || 0}</p>
                <p>Empty (no bookings): {stats?.availabilityEmpty || 0}</p>
              </div>
            </div>

            {/* Bookings */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Total Bookings</p>
              <p className="text-3xl font-bold text-green-900">{stats?.bookings || 0}</p>
              <div className="mt-2 text-xs text-green-700 space-y-1">
                <p>Past: {stats?.bookingsPast || 0}</p>
                <p>Future: {stats?.bookingsFuture || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cleanup Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Cleanup Actions</h2>

          <div className="space-y-4">
            {/* Delete Past Availability */}
            <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    🗓️ Delete Past Empty Slots
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Delete all past availability slots that have no bookings
                  </p>
                  <p className="text-xs text-gray-500">
                    Will delete: {stats?.availabilityPast || 0} past slot(s) with no bookings
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCleanup(
                      'delete-past-empty-availability',
                      `Are you sure you want to delete ${stats?.availabilityPast || 0} past empty availability slots? This cannot be undone.`
                    )
                  }
                  disabled={processing !== null || !stats?.availabilityPast}
                  className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === 'delete-past-empty-availability' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Delete All Empty Slots */}
            <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    📅 Delete All Empty Slots
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Delete all availability slots (past and future) that have no bookings
                  </p>
                  <p className="text-xs text-gray-500">
                    Will delete: {stats?.availabilityEmpty || 0} empty slot(s)
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCleanup(
                      'delete-all-empty-availability',
                      `Are you sure you want to delete ${stats?.availabilityEmpty || 0} empty availability slots? This includes future slots. This cannot be undone.`
                    )
                  }
                  disabled={processing !== null || !stats?.availabilityEmpty}
                  className="ml-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === 'delete-all-empty-availability' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Delete All Availability */}
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-1">
                    ⚠️ Delete ALL Availability Slots
                  </h3>
                  <p className="text-sm text-red-700 mb-2">
                    <strong>DANGER:</strong> Delete all availability slots including those with bookings
                  </p>
                  <p className="text-xs text-red-600">
                    Will delete: {stats?.availability || 0} total slot(s) and {stats?.bookings || 0} booking(s)
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCleanup(
                      'delete-all-availability',
                      `⚠️ DANGER: This will delete ALL ${stats?.availability || 0} availability slots and ${stats?.bookings || 0} bookings. This action cannot be undone. Type DELETE to confirm.`
                    )
                  }
                  disabled={processing !== null || !stats?.availability}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === 'delete-all-availability' ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>

            {/* Delete Past Bookings */}
            <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    📋 Delete Past Bookings
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Delete all bookings for dates in the past
                  </p>
                  <p className="text-xs text-gray-500">
                    Will delete: {stats?.bookingsPast || 0} past booking(s)
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCleanup(
                      'delete-past-bookings',
                      `Are you sure you want to delete ${stats?.bookingsPast || 0} past bookings? This cannot be undone.`
                    )
                  }
                  disabled={processing !== null || !stats?.bookingsPast}
                  className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === 'delete-past-bookings' ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Complete Database Reset */}
            <div className="p-4 border-2 border-red-600 rounded-lg bg-red-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 mb-1">
                    💀 COMPLETE DATABASE RESET
                  </h3>
                  <p className="text-sm text-red-800 mb-2">
                    <strong>EXTREME DANGER:</strong> Delete ALL data - providers, availability, bookings, provider types, categories, everything!
                  </p>
                  <p className="text-xs text-red-700">
                    Will delete: {stats?.providers || 0} provider(s), {stats?.availability || 0} slot(s), {stats?.bookings || 0} booking(s), and all provider types & categories
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleCleanup(
                      'delete-all-data',
                      `💀 EXTREME DANGER: This will PERMANENTLY DELETE ALL DATA for this tenant. This includes:\n\n- ${stats?.providers || 0} providers\n- ${stats?.availability || 0} availability slots\n- ${stats?.bookings || 0} bookings\n- All provider types\n- All categories\n- All service templates\n\nTHIS CANNOT BE UNDONE!\n\nAre you absolutely sure?`
                    )
                  }
                  disabled={processing !== null}
                  className="ml-4 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {processing === 'delete-all-data' ? 'Deleting Everything...' : 'Delete Everything'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Warning:</strong> All deletion actions are permanent and cannot be undone.
            Always make sure you have a backup before performing cleanup operations.
          </p>
        </div>
      </main>
    </div>
  )
}
