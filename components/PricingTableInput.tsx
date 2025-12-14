'use client'

import { useState } from 'react'

interface PricingTableInputProps {
  value: Record<string, number>
  onChange: (table: Record<string, number>) => void
  baseRate?: number
}

const DURATIONS = [30, 60, 90]
const SESSION_TYPES = [
  { key: 'individual', label: '1 Person', icon: '👤' },
  { key: 'couple', label: 'Couple', icon: '👥' },
  { key: 'group', label: 'Group (3+)', icon: '👨‍👩‍👧‍👦' },
]

export default function PricingTableInput({ value, onChange, baseRate = 100 }: PricingTableInputProps) {
  const [useCustomPricing, setUseCustomPricing] = useState(Object.keys(value).length > 0)

  const handlePriceChange = (sessionType: string, duration: number, price: string) => {
    const key = `${sessionType}_${duration}`
    const numPrice = parseFloat(price) || 0

    const newTable = { ...value }
    if (numPrice > 0) {
      newTable[key] = numPrice
    } else {
      delete newTable[key]
    }

    onChange(newTable)
  }

  const getPrice = (sessionType: string, duration: number): string => {
    const key = `${sessionType}_${duration}`
    return value[key]?.toString() || ''
  }

  const useDefaults = () => {
    const defaultTable: Record<string, number> = {
      individual_30: Math.round(baseRate * 0.5),
      individual_60: baseRate,
      individual_90: Math.round(baseRate * 1.4),
      couple_30: Math.round(baseRate * 0.75),
      couple_60: Math.round(baseRate * 1.5),
      couple_90: Math.round(baseRate * 2.0),
      group_30: Math.round(baseRate * 1.0),
      group_60: Math.round(baseRate * 2.0),
      group_90: Math.round(baseRate * 2.7),
    }
    onChange(defaultTable)
  }

  const clearAll = () => {
    onChange({})
    setUseCustomPricing(false)
  }

  if (!useCustomPricing) {
    return (
      <div className="border border-gray-300 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">No custom pricing - will use standard rates</p>
          <button
            type="button"
            onClick={() => setUseCustomPricing(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Custom Pricing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Custom Pricing Table
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={useDefaults}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Use Defaults (${ baseRate} base)
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Session Type
              </th>
              {DURATIONS.map(duration => (
                <th key={duration} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {duration} min
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {SESSION_TYPES.map(sessionType => (
              <tr key={sessionType.key}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{sessionType.icon}</span>
                    <span className="text-sm font-medium text-gray-900">{sessionType.label}</span>
                  </div>
                </td>
                {DURATIONS.map(duration => (
                  <td key={duration} className="px-3 py-2 text-center">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={getPrice(sessionType.key, duration)}
                        onChange={(e) => handlePriceChange(sessionType.key, duration, e.target.value)}
                        placeholder="--"
                        className="w-20 pl-6 pr-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Leave blank to skip an option. Clients will only see filled-in pricing options.
      </p>
    </div>
  )
}
