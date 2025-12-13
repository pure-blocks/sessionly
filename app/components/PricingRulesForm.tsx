'use client'

import { useState } from 'react'
import {
  PricingRules,
  SimplePricing,
  TieredPricing,
  DiscountPricing,
  FlatPricing,
  HybridPricing,
  PricingModelType,
} from '@/types/pricing'
import { validatePricingRules, getPricingPreview } from '@/lib/pricing'

interface PricingRulesFormProps {
  initialRules?: PricingRules | null
  onSave: (rules: PricingRules) => void
  onCancel: () => void
}

export default function PricingRulesForm({
  initialRules,
  onSave,
  onCancel,
}: PricingRulesFormProps) {
  const [pricingType, setPricingType] = useState<PricingModelType>(
    initialRules?.type || 'simple'
  )
  const [rules, setRules] = useState<PricingRules>(
    initialRules || { type: 'simple', pricePerPerson: 0 }
  )
  const [errors, setErrors] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validatePricingRules(rules)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setErrors([])
    onSave(rules)
  }

  const preview = getPricingPreview(rules, 10)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Configure Pricing Rules
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Pricing Model Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pricing Model
          </label>
          <select
            value={pricingType}
            onChange={(e) => {
              const newType = e.target.value as PricingModelType
              setPricingType(newType)

              // Initialize with default values for each type
              switch (newType) {
                case 'simple':
                  setRules({ type: 'simple', pricePerPerson: 100 })
                  break
                case 'tiered':
                  setRules({
                    type: 'tiered',
                    tiers: [
                      { minSize: 1, maxSize: 1, pricePerPerson: 100 },
                      { minSize: 2, maxSize: 4, pricePerPerson: 90 },
                    ],
                  })
                  break
                case 'discount':
                  setRules({
                    type: 'discount',
                    basePrice: 100,
                    discounts: [{ minSize: 2, discountPercent: 10 }],
                  })
                  break
                case 'flat':
                  setRules({ type: 'flat', totalPrice: 500, maxCapacity: 10 })
                  break
                case 'hybrid':
                  setRules({
                    type: 'hybrid',
                    soloPrice: 100,
                    groupPrice: 80,
                    groupMinSize: 2,
                  })
                  break
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="simple">Simple - Fixed price per person</option>
            <option value="tiered">Tiered - Different prices for group sizes</option>
            <option value="discount">Discount - Percentage off for groups</option>
            <option value="flat">Flat Rate - One price for all</option>
            <option value="hybrid">Hybrid - Mix of solo, group, and flat rates</option>
          </select>
        </div>

        {/* Simple Pricing Form */}
        {pricingType === 'simple' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price Per Person ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(rules as SimplePricing).pricePerPerson}
                onChange={(e) =>
                  setRules({ ...rules, pricePerPerson: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Tiered Pricing Form */}
        {pricingType === 'tiered' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pricing Tiers
              </label>
              <button
                type="button"
                onClick={() => {
                  const tieredRules = rules as TieredPricing
                  setRules({
                    ...tieredRules,
                    tiers: [
                      ...tieredRules.tiers,
                      { minSize: 1, maxSize: 1, pricePerPerson: 100 },
                    ],
                  })
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                + Add Tier
              </button>
            </div>
            {(rules as TieredPricing).tiers.map((tier, index) => (
              <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Min"
                    value={tier.minSize}
                    onChange={(e) => {
                      const tieredRules = rules as TieredPricing
                      const newTiers = [...tieredRules.tiers]
                      newTiers[index].minSize = parseInt(e.target.value)
                      setRules({ ...tieredRules, tiers: newTiers })
                    }}
                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Max"
                    value={tier.maxSize}
                    onChange={(e) => {
                      const tieredRules = rules as TieredPricing
                      const newTiers = [...tieredRules.tiers]
                      newTiers[index].maxSize = parseInt(e.target.value)
                      setRules({ ...tieredRules, tiers: newTiers })
                    }}
                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <span className="text-gray-500">@</span>
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    value={tier.pricePerPerson}
                    onChange={(e) => {
                      const tieredRules = rules as TieredPricing
                      const newTiers = [...tieredRules.tiers]
                      newTiers[index].pricePerPerson = parseFloat(e.target.value)
                      setRules({ ...tieredRules, tiers: newTiers })
                    }}
                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tieredRules = rules as TieredPricing
                    const newTiers = tieredRules.tiers.filter((_, i) => i !== index)
                    setRules({ ...tieredRules, tiers: newTiers })
                  }}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Discount Pricing Form */}
        {pricingType === 'discount' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base Price Per Person ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(rules as DiscountPricing).basePrice}
                onChange={(e) =>
                  setRules({ ...rules, basePrice: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group Discounts
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const discountRules = rules as DiscountPricing
                    setRules({
                      ...discountRules,
                      discounts: [
                        ...discountRules.discounts,
                        { minSize: 2, discountPercent: 10 },
                      ],
                    })
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Add Discount
                </button>
              </div>
              {(rules as DiscountPricing).discounts.map((discount, index) => (
                <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">≥</span>
                  <input
                    type="number"
                    min="2"
                    placeholder="Min people"
                    value={discount.minSize}
                    onChange={(e) => {
                      const discountRules = rules as DiscountPricing
                      const newDiscounts = [...discountRules.discounts]
                      newDiscounts[index].minSize = parseInt(e.target.value)
                      setRules({ ...discountRules, discounts: newDiscounts })
                    }}
                    className="w-24 px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">people get</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    placeholder="%"
                    value={discount.discountPercent}
                    onChange={(e) => {
                      const discountRules = rules as DiscountPricing
                      const newDiscounts = [...discountRules.discounts]
                      newDiscounts[index].discountPercent = parseInt(e.target.value)
                      setRules({ ...discountRules, discounts: newDiscounts })
                    }}
                    className="w-16 px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-white"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300">% off</span>
                  <button
                    type="button"
                    onClick={() => {
                      const discountRules = rules as DiscountPricing
                      const newDiscounts = discountRules.discounts.filter((_, i) => i !== index)
                      setRules({ ...discountRules, discounts: newDiscounts })
                    }}
                    className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm ml-auto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flat Rate Pricing Form */}
        {pricingType === 'flat' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(rules as FlatPricing).totalPrice}
                onChange={(e) =>
                  setRules({ ...rules, totalPrice: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Capacity
              </label>
              <input
                type="number"
                min="1"
                value={(rules as FlatPricing).maxCapacity}
                onChange={(e) =>
                  setRules({ ...rules, maxCapacity: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Hybrid Pricing Form */}
        {pricingType === 'hybrid' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Solo Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(rules as HybridPricing).soloPrice}
                onChange={(e) =>
                  setRules({ ...rules, soloPrice: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group Price Per Person ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={(rules as HybridPricing).groupPrice}
                onChange={(e) =>
                  setRules({ ...rules, groupPrice: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Group Size
              </label>
              <input
                type="number"
                min="2"
                value={(rules as HybridPricing).groupMinSize}
                onChange={(e) =>
                  setRules({ ...rules, groupMinSize: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Optional: Flat Rate for Large Groups
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="Threshold (people)"
                    value={(rules as HybridPricing).flatRateThreshold || ''}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        flatRateThreshold: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Flat price ($)"
                    value={(rules as HybridPricing).flatRatePrice || ''}
                    onChange={(e) =>
                      setRules({
                        ...rules,
                        flatRatePrice: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-red-800 dark:text-red-200 font-medium mb-2">Validation Errors:</h4>
            <ul className="list-disc list-inside text-red-700 dark:text-red-300 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview Toggle */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {showPreview ? 'Hide' : 'Show'} Pricing Preview
          </button>
        </div>

        {/* Pricing Preview */}
        {showPreview && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Pricing Preview:</h4>
            <div className="space-y-2">
              {preview.map(({ partySize, calculation }) => (
                <div
                  key={partySize}
                  className="flex justify-between items-center text-sm text-blue-800 dark:text-blue-200"
                >
                  <span>{partySize} {partySize === 1 ? 'person' : 'people'}:</span>
                  <span className="font-medium">
                    ${calculation.totalPrice.toFixed(2)}
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                      (${calculation.pricePerPerson.toFixed(2)}/person)
                    </span>
                    {calculation.savings && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                        Save ${calculation.savings.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Pricing Rules
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
