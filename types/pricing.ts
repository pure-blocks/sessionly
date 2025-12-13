// Pricing Rule Types

export type PricingModelType = 'tiered' | 'discount' | 'flat' | 'hybrid' | 'simple' | 'step-based'

// Simple pricing - single price per person
export interface SimplePricing {
  type: 'simple'
  pricePerPerson: number
}

// Tiered pricing - different price per person based on group size
export interface TieredPricingTier {
  minSize: number
  maxSize: number
  pricePerPerson: number
}

export interface TieredPricing {
  type: 'tiered'
  tiers: TieredPricingTier[]
}

// Discount pricing - base price with percentage discounts for groups
export interface DiscountPricingTier {
  minSize: number
  discountPercent: number
}

export interface DiscountPricing {
  type: 'discount'
  basePrice: number
  discounts: DiscountPricingTier[]
}

// Flat rate pricing - one price regardless of group size
export interface FlatPricing {
  type: 'flat'
  totalPrice: number
  maxCapacity: number
}

// Hybrid pricing - combination of different models
export interface HybridPricing {
  type: 'hybrid'
  soloPrice: number // Price for 1 person
  groupPrice: number // Price per person when in a group
  groupMinSize: number // Minimum size to qualify as group
  flatRateThreshold?: number // Optional: switch to flat rate at this size
  flatRatePrice?: number // Optional: flat rate price
}

// Step-based pricing - price drops every STEP_SIZE people (platform constant = 2)
export interface StepBasedPricing {
  type: 'step-based'
  soloPrice: number // Base price for 1 person
  dropRatePercent: number // % price drops per step
  minPricePerPerson: number // Floor price per person
  minSessionEarnings: number // Minimum total session earnings
}

// Union type for all pricing models
export type PricingRules =
  | SimplePricing
  | TieredPricing
  | DiscountPricing
  | FlatPricing
  | HybridPricing
  | StepBasedPricing

// Result of pricing calculation
export interface PricingCalculation {
  totalPrice: number
  pricePerPerson: number
  breakdown: string
  appliedRule: string
  savings?: number // If there's a discount applied
}

// For display purposes
export interface PricingDisplay {
  partySize: number
  totalPrice: number
  pricePerPerson: number
  breakdown: string
  savings?: number
}
