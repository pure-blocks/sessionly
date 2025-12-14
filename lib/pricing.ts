/**
 * Pricing Table System
 * Simple pricing based on session type and duration
 */

export interface PricingOption {
  type: 'individual' | 'couple' | 'group'
  duration: number // in minutes
  price: number
  label?: string
}

export type PricingTable = Record<string, number>

/**
 * Parse pricing key to extract type and duration
 * Format: "individual_60", "couple_90", "group_30"
 */
export function parsePricingKey(key: string): {
  type: 'individual' | 'couple' | 'group'
  duration: number
  partySize: number
} | null {
  const match = key.match(/^(individual|couple|group)_(\d+)$/)
  if (!match) return null

  const type = match[1] as 'individual' | 'couple' | 'group'
  const duration = parseInt(match[2])

  // Determine party size based on type
  const partySize = type === 'individual' ? 1 : type === 'couple' ? 2 : 3

  return { type, duration, partySize }
}

/**
 * Create pricing key from type and duration
 */
export function createPricingKey(
  type: 'individual' | 'couple' | 'group',
  duration: number
): string {
  return `${type}_${duration}`
}

/**
 * Get display label for pricing option
 */
export function getPricingLabel(key: string): string {
  const parsed = parsePricingKey(key)
  if (!parsed) return key

  const typeLabel =
    parsed.type === 'individual'
      ? '1 Person'
      : parsed.type === 'couple'
      ? 'Couple (2 people)'
      : 'Group (3+ people)'

  return `${typeLabel} - ${parsed.duration} min`
}

/**
 * Validate pricing table structure
 */
export function validatePricingTable(table: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!table || typeof table !== 'object') {
    errors.push('Pricing table must be an object')
    return { valid: false, errors }
  }

  // Allow empty table
  if (Object.keys(table).length === 0) {
    return { valid: true, errors: [] }
  }

  // Validate each entry
  Object.entries(table).forEach(([key, value]) => {
    // Check key format
    if (!parsePricingKey(key)) {
      errors.push(`Invalid pricing key format: ${key}. Use format like "individual_60"`)
    }

    // Check value is a positive number
    if (typeof value !== 'number' || value < 0) {
      errors.push(`Price for ${key} must be a positive number, got ${value}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Find matching price from pricing table
 */
export function getPriceFromTable(
  table: PricingTable | null,
  sessionType: 'individual' | 'couple' | 'group',
  duration: number
): number | null {
  if (!table) return null

  const key = createPricingKey(sessionType, duration)
  return table[key] ?? null
}

/**
 * Get all pricing options from table as array
 */
export function getPricingOptions(table: PricingTable | null): PricingOption[] {
  if (!table) return []

  return Object.entries(table)
    .map(([key, price]) => {
      const parsed = parsePricingKey(key)
      if (!parsed) return null

      return {
        type: parsed.type,
        duration: parsed.duration,
        price,
        label: getPricingLabel(key),
      }
    })
    .filter((opt): opt is PricingOption => opt !== null)
}

/**
 * Calculate session duration from start and end time
 * Format: "HH:MM"
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  return endMinutes - startMinutes
}

/**
 * Determine session type from party size
 */
export function getSessionTypeFromPartySize(
  partySize: number
): 'individual' | 'couple' | 'group' {
  if (partySize === 1) return 'individual'
  if (partySize === 2) return 'couple'
  return 'group'
}

/**
 * Create default pricing table based on base rate
 */
export function createDefaultPricingTable(baseRate: number = 100): PricingTable {
  return {
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
}

/**
 * Find best matching price from table
 * If exact match not found, tries to find closest duration
 */
export function findBestPrice(
  table: PricingTable | null,
  sessionType: 'individual' | 'couple' | 'group',
  duration: number
): { price: number | null; exactMatch: boolean } {
  if (!table) return { price: null, exactMatch: false }

  // Try exact match first
  const exactPrice = getPriceFromTable(table, sessionType, duration)
  if (exactPrice !== null) {
    return { price: exactPrice, exactMatch: true }
  }

  // Try to find closest duration for this session type
  const options = getPricingOptions(table)
    .filter(opt => opt.type === sessionType)
    .sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))

  if (options.length > 0) {
    return { price: options[0].price, exactMatch: false }
  }

  return { price: null, exactMatch: false }
}
