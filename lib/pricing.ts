import {
  PricingRules,
  PricingCalculation,
  SimplePricing,
  TieredPricing,
  DiscountPricing,
  FlatPricing,
  HybridPricing,
  StepBasedPricing,
} from '@/types/pricing'

/**
 * Calculate pricing based on party size and pricing rules
 */
export function calculatePrice(
  partySize: number,
  pricingRules: PricingRules | null,
  fallbackPrice?: number
): PricingCalculation {
  // If no pricing rules, use fallback or default
  if (!pricingRules) {
    const price = fallbackPrice || 0
    return {
      totalPrice: price * partySize,
      pricePerPerson: price,
      breakdown: `${partySize} × $${price.toFixed(2)}`,
      appliedRule: 'simple',
    }
  }

  switch (pricingRules.type) {
    case 'simple':
      return calculateSimplePricing(partySize, pricingRules)
    case 'tiered':
      return calculateTieredPricing(partySize, pricingRules)
    case 'discount':
      return calculateDiscountPricing(partySize, pricingRules)
    case 'flat':
      return calculateFlatPricing(partySize, pricingRules)
    case 'hybrid':
      return calculateHybridPricing(partySize, pricingRules)
    case 'step-based':
      return calculateStepBasedPricing(partySize, pricingRules)
    default:
      throw new Error('Invalid pricing rule type')
  }
}

/**
 * Simple pricing - single price per person
 */
function calculateSimplePricing(
  partySize: number,
  rules: SimplePricing
): PricingCalculation {
  const totalPrice = rules.pricePerPerson * partySize
  return {
    totalPrice,
    pricePerPerson: rules.pricePerPerson,
    breakdown: `${partySize} × $${rules.pricePerPerson.toFixed(2)}`,
    appliedRule: 'simple',
  }
}

/**
 * Tiered pricing - different price per person based on group size
 */
function calculateTieredPricing(
  partySize: number,
  rules: TieredPricing
): PricingCalculation {
  // Find applicable tier
  const tier = rules.tiers.find(
    (t) => partySize >= t.minSize && partySize <= t.maxSize
  )

  if (!tier) {
    // If no tier matches, use the highest tier's price
    const highestTier = rules.tiers[rules.tiers.length - 1]
    const totalPrice = highestTier.pricePerPerson * partySize
    return {
      totalPrice,
      pricePerPerson: highestTier.pricePerPerson,
      breakdown: `${partySize} × $${highestTier.pricePerPerson.toFixed(2)} (max tier)`,
      appliedRule: 'tiered',
    }
  }

  const totalPrice = tier.pricePerPerson * partySize
  return {
    totalPrice,
    pricePerPerson: tier.pricePerPerson,
    breakdown: `${partySize} × $${tier.pricePerPerson.toFixed(2)} (${tier.minSize}-${tier.maxSize} people)`,
    appliedRule: 'tiered',
  }
}

/**
 * Discount pricing - base price with percentage discounts for groups
 */
function calculateDiscountPricing(
  partySize: number,
  rules: DiscountPricing
): PricingCalculation {
  // Find applicable discount (highest one that applies)
  const applicableDiscounts = rules.discounts
    .filter((d) => partySize >= d.minSize)
    .sort((a, b) => b.discountPercent - a.discountPercent)

  const discount = applicableDiscounts[0]

  if (!discount) {
    // No discount applies
    const totalPrice = rules.basePrice * partySize
    return {
      totalPrice,
      pricePerPerson: rules.basePrice,
      breakdown: `${partySize} × $${rules.basePrice.toFixed(2)}`,
      appliedRule: 'discount',
    }
  }

  // Apply discount
  const discountMultiplier = 1 - discount.discountPercent / 100
  const discountedPrice = rules.basePrice * discountMultiplier
  const totalPrice = discountedPrice * partySize
  const savings = (rules.basePrice - discountedPrice) * partySize

  return {
    totalPrice,
    pricePerPerson: discountedPrice,
    breakdown: `${partySize} × $${discountedPrice.toFixed(2)} (${discount.discountPercent}% off)`,
    appliedRule: 'discount',
    savings,
  }
}

/**
 * Flat rate pricing - one price regardless of group size
 */
function calculateFlatPricing(
  partySize: number,
  rules: FlatPricing
): PricingCalculation {
  if (partySize > rules.maxCapacity) {
    throw new Error(`Party size exceeds maximum capacity of ${rules.maxCapacity}`)
  }

  const pricePerPerson = rules.totalPrice / partySize

  return {
    totalPrice: rules.totalPrice,
    pricePerPerson,
    breakdown: `Flat rate: $${rules.totalPrice.toFixed(2)} (up to ${rules.maxCapacity} people)`,
    appliedRule: 'flat',
  }
}

/**
 * Hybrid pricing - combination of different models
 */
function calculateHybridPricing(
  partySize: number,
  rules: HybridPricing
): PricingCalculation {
  // Check if flat rate threshold is met
  if (
    rules.flatRateThreshold &&
    rules.flatRatePrice &&
    partySize >= rules.flatRateThreshold
  ) {
    const pricePerPerson = rules.flatRatePrice / partySize
    return {
      totalPrice: rules.flatRatePrice,
      pricePerPerson,
      breakdown: `Flat rate: $${rules.flatRatePrice.toFixed(2)} (${partySize}+ people)`,
      appliedRule: 'hybrid-flat',
    }
  }

  // Solo pricing
  if (partySize === 1) {
    return {
      totalPrice: rules.soloPrice,
      pricePerPerson: rules.soloPrice,
      breakdown: `Solo session: $${rules.soloPrice.toFixed(2)}`,
      appliedRule: 'hybrid-solo',
    }
  }

  // Group pricing
  if (partySize >= rules.groupMinSize) {
    const totalPrice = rules.groupPrice * partySize
    const savings = (rules.soloPrice - rules.groupPrice) * partySize
    return {
      totalPrice,
      pricePerPerson: rules.groupPrice,
      breakdown: `${partySize} × $${rules.groupPrice.toFixed(2)} (group rate)`,
      appliedRule: 'hybrid-group',
      savings,
    }
  }

  // Between solo and group minimum - use solo price
  const totalPrice = rules.soloPrice * partySize
  return {
    totalPrice,
    pricePerPerson: rules.soloPrice,
    breakdown: `${partySize} × $${rules.soloPrice.toFixed(2)}`,
    appliedRule: 'hybrid-solo',
  }
}

/**
 * Step-based pricing - price drops every STEP_SIZE people
 * Platform constant: STEP_SIZE = 2
 */
function calculateStepBasedPricing(
  partySize: number,
  rules: StepBasedPricing
): PricingCalculation {
  const STEP_SIZE = 2 // Platform constant

  // Step 1: Calculate step index
  const stepIndex = Math.floor((partySize - 1) / STEP_SIZE)

  // Step 2: Calculate raw price using compound drop rate
  const dropMultiplier = Math.pow(1 - rules.dropRatePercent / 100, stepIndex)
  const rawPrice = rules.soloPrice * dropMultiplier

  // Step 3: Apply floor price
  let pricePerPerson = Math.max(rawPrice, rules.minPricePerPerson)
  let hitFloor = pricePerPerson === rules.minPricePerPerson && rawPrice < rules.minPricePerPerson

  // Step 4: Calculate total
  let totalPrice = pricePerPerson * partySize

  // Step 5: Check minimum session earnings
  let adjustedForMinimum = false
  if (totalPrice < rules.minSessionEarnings) {
    // Adjust price per person to meet minimum
    pricePerPerson = rules.minSessionEarnings / partySize
    totalPrice = rules.minSessionEarnings
    adjustedForMinimum = true
    hitFloor = false // Override floor if we're boosting for minimum
  }

  // Step 6: Round to nearest dollar
  pricePerPerson = Math.round(pricePerPerson)
  totalPrice = pricePerPerson * partySize

  const savings = rules.soloPrice - pricePerPerson
  const breakdown = adjustedForMinimum
    ? `${partySize} × $${pricePerPerson.toFixed(0)} (min earnings adjusted)`
    : hitFloor
    ? `${partySize} × $${pricePerPerson.toFixed(0)} (floor price)`
    : `${partySize} × $${pricePerPerson.toFixed(0)} (step ${stepIndex})`

  return {
    totalPrice,
    pricePerPerson,
    breakdown,
    appliedRule: 'step-based',
    savings: savings > 0 ? savings * partySize : undefined,
  }
}

/**
 * Validate pricing rules
 */
export function validatePricingRules(rules: PricingRules): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    switch (rules.type) {
      case 'simple':
        if (rules.pricePerPerson <= 0) {
          errors.push('Price per person must be greater than 0')
        }
        break

      case 'tiered':
        if (!rules.tiers || rules.tiers.length === 0) {
          errors.push('At least one tier is required')
        }
        rules.tiers.forEach((tier, index) => {
          if (tier.minSize < 1) {
            errors.push(`Tier ${index + 1}: Minimum size must be at least 1`)
          }
          if (tier.maxSize < tier.minSize) {
            errors.push(`Tier ${index + 1}: Maximum size must be >= minimum size`)
          }
          if (tier.pricePerPerson <= 0) {
            errors.push(`Tier ${index + 1}: Price must be greater than 0`)
          }
        })
        break

      case 'discount':
        if (rules.basePrice <= 0) {
          errors.push('Base price must be greater than 0')
        }
        if (!rules.discounts || rules.discounts.length === 0) {
          errors.push('At least one discount tier is required')
        }
        rules.discounts.forEach((discount, index) => {
          if (discount.minSize < 2) {
            errors.push(`Discount ${index + 1}: Minimum size must be at least 2`)
          }
          if (discount.discountPercent <= 0 || discount.discountPercent >= 100) {
            errors.push(`Discount ${index + 1}: Discount must be between 0 and 100%`)
          }
        })
        break

      case 'flat':
        if (rules.totalPrice <= 0) {
          errors.push('Total price must be greater than 0')
        }
        if (rules.maxCapacity < 1) {
          errors.push('Max capacity must be at least 1')
        }
        break

      case 'hybrid':
        if (rules.soloPrice <= 0) {
          errors.push('Solo price must be greater than 0')
        }
        if (rules.groupPrice <= 0) {
          errors.push('Group price must be greater than 0')
        }
        if (rules.groupMinSize < 2) {
          errors.push('Group minimum size must be at least 2')
        }
        if (rules.flatRateThreshold && rules.flatRateThreshold < rules.groupMinSize) {
          errors.push('Flat rate threshold must be >= group minimum size')
        }
        if (rules.flatRateThreshold && !rules.flatRatePrice) {
          errors.push('Flat rate price is required when threshold is set')
        }
        break

      case 'step-based':
        if (rules.soloPrice <= 0) {
          errors.push('Solo price must be greater than 0')
        }
        if (rules.dropRatePercent < 0 || rules.dropRatePercent > 100) {
          errors.push('Drop rate must be between 0% and 100%')
        }
        if (rules.minPricePerPerson <= 0) {
          errors.push('Minimum price per person must be greater than 0')
        }
        if (rules.minPricePerPerson > rules.soloPrice) {
          errors.push('Minimum price per person cannot exceed solo price')
        }
        if (rules.minSessionEarnings < 0) {
          errors.push('Minimum session earnings cannot be negative')
        }
        if (rules.minSessionEarnings > rules.soloPrice) {
          errors.push('Minimum session earnings should not exceed solo price (single person booking would be cancelled)')
        }
        break
    }
  } catch (error) {
    errors.push('Invalid pricing rule structure')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get pricing preview for multiple party sizes
 */
export function getPricingPreview(
  pricingRules: PricingRules | null,
  maxSize: number = 10,
  fallbackPrice?: number
): Array<{ partySize: number; calculation: PricingCalculation }> {
  const preview: Array<{ partySize: number; calculation: PricingCalculation }> = []

  for (let size = 1; size <= maxSize; size++) {
    try {
      const calculation = calculatePrice(size, pricingRules, fallbackPrice)
      preview.push({ partySize: size, calculation })
    } catch (error) {
      // Skip invalid sizes
      continue
    }
  }

  return preview
}
