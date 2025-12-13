# Group Pricing System Documentation

A comprehensive, flexible pricing system that supports multiple pricing models for group bookings.

## Overview

The pricing system allows providers to configure custom pricing rules that automatically calculate prices based on party size. The system supports 5 different pricing models, each suited for different business needs.

## Pricing Models

### 1. Simple Pricing
**Use Case:** Fixed price per person, no discounts

```json
{
  "type": "simple",
  "pricePerPerson": 100
}
```

**Example:**
- 1 person: $100 ($100/person)
- 2 people: $200 ($100/person)
- 5 people: $500 ($100/person)

---

### 2. Tiered Pricing
**Use Case:** Different prices for different group sizes (most common)

```json
{
  "type": "tiered",
  "tiers": [
    { "minSize": 1, "maxSize": 1, "pricePerPerson": 100 },
    { "minSize": 2, "maxSize": 3, "pricePerPerson": 90 },
    { "minSize": 4, "maxSize": 6, "pricePerPerson": 80 },
    { "minSize": 7, "maxSize": 10, "pricePerPerson": 70 }
  ]
}
```

**Example:**
- 1 person: $100 ($100/person)
- 2 people: $180 ($90/person)
- 5 people: $400 ($80/person)
- 8 people: $560 ($70/person)

**Best For:** Fitness classes, workshops, training sessions

---

### 3. Discount Pricing
**Use Case:** Percentage discounts for larger groups

```json
{
  "type": "discount",
  "basePrice": 100,
  "discounts": [
    { "minSize": 2, "discountPercent": 10 },
    { "minSize": 4, "discountPercent": 20 },
    { "minSize": 6, "discountPercent": 30 }
  ]
}
```

**Example:**
- 1 person: $100 ($100/person, 0% off)
- 2 people: $180 ($90/person, 10% off) - Save $20
- 5 people: $400 ($80/person, 20% off) - Save $100
- 7 people: $490 ($70/person, 30% off) - Save $210

**Best For:** When you want to incentivize larger groups with percentage discounts

---

### 4. Flat Rate Pricing
**Use Case:** One price regardless of group size (up to capacity)

```json
{
  "type": "flat",
  "totalPrice": 500,
  "maxCapacity": 10
}
```

**Example:**
- 1 person: $500 ($500/person)
- 5 people: $500 ($100/person)
- 10 people: $500 ($50/person)

**Best For:** Private sessions, venue rentals, exclusive bookings

---

### 5. Hybrid Pricing
**Use Case:** Combination of solo, group, and flat rates

```json
{
  "type": "hybrid",
  "soloPrice": 100,
  "groupPrice": 80,
  "groupMinSize": 2,
  "flatRateThreshold": 8,
  "flatRatePrice": 500
}
```

**Example:**
- 1 person: $100 (solo rate)
- 2-7 people: $80/person (group rate)
- 8+ people: $500 total (flat rate)

Specific examples:
- 1 person: $100 ($100/person)
- 3 people: $240 ($80/person) - Save $60
- 6 people: $480 ($80/person) - Save $120
- 10 people: $500 ($50/person, flat rate)

**Best For:** Maximum flexibility, complex pricing strategies

---

## Implementation

### Database Schema

The `pricingRules` field is a JSON string stored in two tables:

**Availability Table:**
```sql
ALTER TABLE Availability ADD COLUMN pricingRules TEXT;
```

**ProviderService Table:**
```sql
ALTER TABLE ProviderService ADD COLUMN pricingRules TEXT;
```

### Files Structure

```
lib/
  ├── pricing.ts          # Pricing calculation engine
types/
  ├── pricing.ts          # TypeScript interfaces
app/
  ├── components/
  │   └── PricingRulesForm.tsx  # UI component for configuration
  ├── api/
      ├── pricing/
      │   └── preview/
      │       └── route.ts        # Price preview API
      └── [tenantSlug]/
          └── bookings/
              └── route.ts        # Integrated with booking creation
```

## Usage

### 1. For Providers: Configure Pricing

```tsx
import PricingRulesForm from '@/app/components/PricingRulesForm'

function AvailabilitySettings() {
  const handleSave = async (rules: PricingRules) => {
    // Save to availability
    await fetch('/api/availability', {
      method: 'PATCH',
      body: JSON.stringify({
        pricingRules: JSON.stringify(rules)
      })
    })
  }

  return (
    <PricingRulesForm
      initialRules={currentRules}
      onSave={handleSave}
      onCancel={() => {}}
    />
  )
}
```

### 2. For Booking Flow: Calculate Price

```typescript
import { calculatePrice } from '@/lib/pricing'
import { PricingRules } from '@/types/pricing'

// Parse pricing rules from availability
const pricingRules: PricingRules = JSON.parse(availability.pricingRules)

// Calculate for specific party size
const pricing = calculatePrice(partySize, pricingRules, fallbackPrice)

console.log(pricing.totalPrice)      // 240
console.log(pricing.pricePerPerson)  // 80
console.log(pricing.breakdown)       // "3 × $80.00 (group rate)"
console.log(pricing.savings)         // 60 (if discount applied)
```

### 3. Preview Pricing

```typescript
import { getPricingPreview } from '@/lib/pricing'

// Get pricing for party sizes 1-10
const preview = getPricingPreview(pricingRules, 10, fallbackPrice)

preview.forEach(({ partySize, calculation }) => {
  console.log(`${partySize} people: $${calculation.totalPrice}`)
})
```

### 4. API: Get Price Preview

```bash
POST /api/pricing/preview
Content-Type: application/json

{
  "pricingRules": {
    "type": "tiered",
    "tiers": [
      { "minSize": 1, "maxSize": 1, "pricePerPerson": 100 },
      { "minSize": 2, "maxSize": 5, "pricePerPerson": 90 }
    ]
  },
  "maxSize": 10
}
```

## Validation

The system includes comprehensive validation:

```typescript
import { validatePricingRules } from '@/lib/pricing'

const validation = validatePricingRules(pricingRules)

if (!validation.valid) {
  console.error(validation.errors)
  // ["Tier 1: Minimum size must be at least 1"]
}
```

### Validation Rules

**Simple Pricing:**
- Price per person must be > 0

**Tiered Pricing:**
- At least one tier required
- Min size ≥ 1
- Max size ≥ min size
- Price per person > 0

**Discount Pricing:**
- Base price > 0
- At least one discount tier required
- Min size ≥ 2
- Discount percent between 0-100%

**Flat Rate Pricing:**
- Total price > 0
- Max capacity ≥ 1

**Hybrid Pricing:**
- Solo price > 0
- Group price > 0
- Group min size ≥ 2
- If flat rate threshold set, must have flat rate price
- Flat rate threshold ≥ group min size

## Integration with Booking Flow

The booking API automatically uses pricing rules:

```typescript
// app/api/[tenantSlug]/bookings/route.ts

// 1. Parse pricing rules from availability
const pricingRules = availability.pricingRules
  ? JSON.parse(availability.pricingRules)
  : null

// 2. Calculate price
const pricing = calculatePrice(partySize, pricingRules, availability.price)

// 3. Create booking with calculated price
const booking = await prisma.booking.create({
  data: {
    // ...
    pricePerPerson: pricing.pricePerPerson,
    totalPrice: pricing.totalPrice,
  }
})
```

## UI Component Features

The `PricingRulesForm` component provides:

- ✅ **5 Pricing Models** - Easy selection dropdown
- ✅ **Dynamic Forms** - Model-specific input fields
- ✅ **Add/Remove Tiers** - For tiered and discount pricing
- ✅ **Real-time Preview** - See pricing for 1-10 people
- ✅ **Validation** - Inline error messages
- ✅ **Dark Mode** - Full dark mode support
- ✅ **Savings Display** - Shows discounts applied

## Examples by Use Case

### Personal Training
```json
{
  "type": "tiered",
  "tiers": [
    { "minSize": 1, "maxSize": 1, "pricePerPerson": 100 },
    { "minSize": 2, "maxSize": 2, "pricePerPerson": 75 }
  ]
}
```

### Yoga Class
```json
{
  "type": "simple",
  "pricePerPerson": 25
}
```

### Private Venue Rental
```json
{
  "type": "flat",
  "totalPrice": 1000,
  "maxCapacity": 50
}
```

### Group Coaching
```json
{
  "type": "discount",
  "basePrice": 80,
  "discounts": [
    { "minSize": 3, "discountPercent": 15 },
    { "minSize": 5, "discountPercent": 25 }
  ]
}
```

### Hybrid Fitness Bootcamp
```json
{
  "type": "hybrid",
  "soloPrice": 120,
  "groupPrice": 90,
  "groupMinSize": 2,
  "flatRateThreshold": 10,
  "flatRatePrice": 800
}
```

## Testing

### Test Pricing Calculator

```typescript
import { calculatePrice } from '@/lib/pricing'

const rules = {
  type: 'tiered' as const,
  tiers: [
    { minSize: 1, maxSize: 1, pricePerPerson: 100 },
    { minSize: 2, maxSize: 5, pricePerPerson: 80 },
  ]
}

// Test case 1: Solo
expect(calculatePrice(1, rules).totalPrice).toBe(100)

// Test case 2: Small group
expect(calculatePrice(3, rules).totalPrice).toBe(240)

// Test case 3: With savings
const result = calculatePrice(3, {
  type: 'discount',
  basePrice: 100,
  discounts: [{ minSize: 2, discountPercent: 20 }]
})
expect(result.totalPrice).toBe(240)
expect(result.savings).toBe(60)
```

## Migration Path

### Step 1: Add pricing rules to existing availability
```typescript
// Update existing availability slots
await prisma.availability.updateMany({
  where: { price: { not: null } },
  data: {
    pricingRules: JSON.stringify({
      type: 'simple',
      pricePerPerson: // use existing price field
    })
  }
})
```

### Step 2: Backward compatibility
The system automatically falls back to the `price` field if no pricing rules are set:

```typescript
calculatePrice(partySize, null, availability.price)
// Uses simple pricing with availability.price
```

## Best Practices

1. **Start Simple** - Begin with simple or tiered pricing
2. **Test Thoroughly** - Use the preview feature before saving
3. **Clear Communication** - Show pricing breakdown to customers
4. **Update Regularly** - Review and adjust based on demand
5. **Consistent Tiers** - Keep tier boundaries consistent across services

## API Reference

### Calculate Price
```typescript
calculatePrice(
  partySize: number,
  pricingRules: PricingRules | null,
  fallbackPrice?: number
): PricingCalculation
```

### Get Pricing Preview
```typescript
getPricingPreview(
  pricingRules: PricingRules | null,
  maxSize: number = 10,
  fallbackPrice?: number
): Array<{ partySize: number; calculation: PricingCalculation }>
```

### Validate Pricing Rules
```typescript
validatePricingRules(
  rules: PricingRules
): { valid: boolean; errors: string[] }
```

## Troubleshooting

### Issue: Pricing not calculating correctly
- Check JSON parsing: `JSON.parse(pricingRules)`
- Verify pricing rules with validation function
- Check for null/undefined values

### Issue: Validation errors
- Review validation rules in documentation
- Ensure all required fields are filled
- Check min/max values are logical

### Issue: Preview not showing
- Ensure pricing rules are valid
- Check console for errors
- Try with simple pricing first

## Future Enhancements

Potential improvements:
- **Time-based pricing** - Different prices for peak hours
- **Seasonal pricing** - Holiday/weekend rates
- **Member discounts** - Loyalty program integration
- **Dynamic pricing** - Demand-based pricing
- **Bundle pricing** - Package deals
- **Promo codes** - Coupon support

## Support

For issues or questions:
- Check this documentation
- Review validation errors
- Test with simple pricing model first
- Check console logs for errors
