'use client'

import { useState, useEffect } from 'react'

interface PricingConfig {
  soloPrice: number
  dropRatePercent: number
  minPricePerPerson: number
  minSessionEarnings: number
}

interface PricingPreviewRow {
  partySize: number
  pricePerPerson: number
  totalPrice: number
  meetsMinimum: boolean
  dropApplied: number
  hitFloor: boolean
}

interface SimplePricingConfigProps {
  initialConfig?: PricingConfig | null
  maxCapacity?: number
  onSave: (config: PricingConfig) => void
  onCancel: () => void
}

export default function SimplePricingConfig({
  initialConfig,
  maxCapacity = 20,
  onSave,
  onCancel,
}: SimplePricingConfigProps) {
  const [config, setConfig] = useState<PricingConfig>(
    initialConfig || {
      soloPrice: 100,
      dropRatePercent: 10,
      minPricePerPerson: 50,
      minSessionEarnings: 100,
    }
  )

  const [preview, setPreview] = useState<PricingPreviewRow[]>([])
  const [errors, setErrors] = useState<string[]>([])

  // Calculate preview whenever config changes
  useEffect(() => {
    const STEP_SIZE = 2 // Platform constant
    const newPreview: PricingPreviewRow[] = []

    for (let size = 1; size <= maxCapacity; size++) {
      // Step 1: Calculate step index
      const stepIndex = Math.floor((size - 1) / STEP_SIZE)

      // Step 2: Calculate raw price using compound drop rate
      const dropMultiplier = Math.pow(1 - config.dropRatePercent / 100, stepIndex)
      const rawPrice = config.soloPrice * dropMultiplier

      // Step 3: Apply floor price
      let pricePerPerson = Math.max(rawPrice, config.minPricePerPerson)
      let hitFloor = pricePerPerson === config.minPricePerPerson && rawPrice < config.minPricePerPerson

      // Step 4: Calculate total
      let totalPrice = pricePerPerson * size

      // Step 5: Check minimum session earnings
      let meetsMinimum = true
      if (totalPrice < config.minSessionEarnings) {
        // Adjust price per person to meet minimum
        pricePerPerson = config.minSessionEarnings / size
        totalPrice = config.minSessionEarnings
        meetsMinimum = true
        hitFloor = false // Override floor if we're boosting for minimum
      }

      // Step 6: Round to nearest dollar
      pricePerPerson = Math.round(pricePerPerson)
      totalPrice = pricePerPerson * size

      const dropApplied = config.soloPrice - pricePerPerson

      newPreview.push({
        partySize: size,
        pricePerPerson,
        totalPrice,
        meetsMinimum,
        dropApplied,
        hitFloor,
      })
    }

    setPreview(newPreview)
  }, [config, maxCapacity])

  // Validate config
  useEffect(() => {
    const newErrors: string[] = []

    if (config.soloPrice <= 0) {
      newErrors.push('Solo price must be greater than 0')
    }

    if (config.dropRatePercent < 0 || config.dropRatePercent > 100) {
      newErrors.push('Drop rate must be between 0% and 100%')
    }

    if (config.minPricePerPerson <= 0) {
      newErrors.push('Minimum price per person must be greater than 0')
    }

    if (config.minPricePerPerson > config.soloPrice) {
      newErrors.push('Minimum price per person cannot exceed solo price')
    }

    if (config.minSessionEarnings < 0) {
      newErrors.push('Minimum session earnings cannot be negative')
    }

    if (config.minSessionEarnings > config.soloPrice) {
      newErrors.push('Minimum session earnings should not exceed solo price (single person booking would be cancelled)')
    }

    setErrors(newErrors)
  }, [config])

  const handleSave = () => {
    if (errors.length > 0) return
    onSave(config)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        Configure Pricing
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Set your pricing rules and see a live preview for all party sizes
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Solo Price (1 person)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.soloPrice}
                onChange={(e) =>
                  setConfig({ ...config, soloPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Base price when only 1 person books
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Drop Rate per Step
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={config.dropRatePercent}
                onChange={(e) =>
                  setConfig({ ...config, dropRatePercent: parseFloat(e.target.value) || 0 })
                }
                className="w-full pr-8 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg"
              />
              <span className="absolute right-3 top-3 text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Price drops by this % every 2 people (step size = 2)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Price Per Person (Floor)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={config.minPricePerPerson}
                onChange={(e) =>
                  setConfig({ ...config, minPricePerPerson: parseFloat(e.target.value) || 0 })
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Price per person cannot go below this amount
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Session Earnings
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                step="1"
                min="0"
                value={config.minSessionEarnings}
                onChange={(e) =>
                  setConfig({ ...config, minSessionEarnings: parseFloat(e.target.value) || 0 })
                }
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              If total drops below this, price is automatically adjusted up
            </p>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-red-800 dark:text-red-200 font-medium mb-2 text-sm">
                Please fix these issues:
              </h4>
              <ul className="list-disc list-inside text-red-700 dark:text-red-300 text-xs space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Box */}
          {errors.length === 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 text-sm">
                Step-Based Pricing Rules
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• 1 person pays ${config.soloPrice.toFixed(2)} (base price)</li>
                <li>
                  • Price drops {config.dropRatePercent}% every 2 people (step size = 2)
                </li>
                <li>
                  • Within each step, price stays the same
                </li>
                <li>
                  • Price never goes below ${config.minPricePerPerson.toFixed(2)} (floor)
                </li>
                <li>
                  • Session always earns at least ${config.minSessionEarnings.toFixed(2)}
                </li>
                <li className="text-blue-600 dark:text-blue-300 font-medium pt-1">
                  💡 All prices rounded to nearest dollar
                </li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={errors.length > 0}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Save Pricing Config
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Live Preview Table */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Live Pricing Preview
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                      Party Size
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                      Per Person
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.map((row, index) => {
                    // Calculate step for this row
                    const stepIndex = Math.floor((row.partySize - 1) / 2)
                    const prevStepIndex = index > 0 ? Math.floor((preview[index - 1].partySize - 1) / 2) : -1
                    const isNewStep = stepIndex !== prevStepIndex

                    return (
                      <tr
                        key={row.partySize}
                        className={`
                          ${
                            !row.meetsMinimum
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : row.hitFloor
                              ? 'bg-yellow-50 dark:bg-yellow-900/20'
                              : 'bg-white dark:bg-gray-800'
                          }
                          ${isNewStep && index > 0 ? 'border-t-2 border-blue-300 dark:border-blue-600' : ''}
                        `}
                      >
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                          {row.partySize} {row.partySize === 1 ? 'person' : 'people'}
                          {isNewStep && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Step {stepIndex}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                          ${row.pricePerPerson.toFixed(0)}
                          {row.dropApplied > 0 && (
                            <div className="text-xs text-green-600 dark:text-green-400">
                              -{row.dropApplied.toFixed(0)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          ${row.totalPrice.toFixed(0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!row.meetsMinimum ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                              ❌ Cancel
                            </span>
                          ) : row.hitFloor ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                              ⚠️ Floor
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              ✓ OK
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-green-100 dark:bg-green-800 rounded"></span>
              <span>Normal pricing - booking accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-yellow-100 dark:bg-yellow-800 rounded"></span>
              <span>Price floor reached - per-person minimum applied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-100 dark:bg-red-800 rounded"></span>
              <span>Below minimum earnings - booking will be cancelled</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="inline-block w-3 h-0.5 bg-blue-300 dark:bg-blue-600"></span>
              <span className="font-medium">Blue line = New step (every 2 people)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
