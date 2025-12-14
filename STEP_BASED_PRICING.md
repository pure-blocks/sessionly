# Step-Based Pricing System

A deterministic pricing model where prices drop in fixed steps based on group size.

## Platform Constant

```typescript
const STEP_SIZE = 2  // Price drops every 2 people
```

## Configuration Parameters

```typescript
interface StepBasedPricing {
  type: 'step-based'
  soloPrice: number           // Base price for 1 person
  dropRatePercent: number     // % price drops per step
  minPricePerPerson: number   // Floor price (minimum per person)
  minSessionEarnings: number  // Minimum total session earnings
}
```

## Pricing Rules (Deterministic)

### Step Calculation
```
stepIndex = floor((groupSize - 1) / STEP_SIZE)
```

**Examples:**
- 1 person → Step 0
- 2-3 people → Step 1
- 4-5 people → Step 2
- 6-7 people → Step 3

### Price Calculation Algorithm

```typescript
// Step 1: Calculate step index
const stepIndex = Math.floor((groupSize - 1) / STEP_SIZE)

// Step 2: Calculate raw price using compound drop rate
const dropMultiplier = Math.pow(1 - dropRatePercent / 100, stepIndex)
const rawPrice = soloPrice * dropMultiplier

// Step 3: Apply floor price
let pricePerPerson = Math.max(rawPrice, minPricePerPerson)

// Step 4: Calculate total
let totalPrice = pricePerPerson * groupSize

// Step 5: Check minimum session earnings
if (totalPrice < minSessionEarnings) {
  // Adjust price per person to meet minimum
  pricePerPerson = minSessionEarnings / groupSize
  totalPrice = minSessionEarnings
}

// Step 6: Round to nearest dollar
pricePerPerson = Math.round(pricePerPerson)
totalPrice = pricePerPerson * groupSize
```

## Example Configuration

```json
{
  "type": "step-based",
  "soloPrice": 100,
  "dropRatePercent": 10,
  "minPricePerPerson": 50,
  "minSessionEarnings": 100
}
```

### Pricing Preview (1-10 people)

| Party Size | Step | Price Per Person | Total Price | Notes |
|------------|------|------------------|-------------|-------|
| 1 | 0 | $100 | $100 | Base price |
| 2 | 1 | $90 | $180 | 10% drop |
| 3 | 1 | $90 | $270 | Same step |
| 4 | 2 | $81 | $324 | 10% drop from step 1 |
| 5 | 2 | $81 | $405 | Same step |
| 6 | 3 | $73 | $438 | 10% drop from step 2 |
| 7 | 3 | $73 | $511 | Same step |
| 8 | 4 | $66 | $528 | 10% drop from step 3 |
| 9 | 4 | $66 | $594 | Same step |
| 10 | 5 | $59 | $590 | 10% drop from step 4 |

## How It Works in the Application

### 1. Provider Configuration

Providers can configure their step-based pricing from the availability management page:

1. Navigate to **Admin → Providers → [Select Provider] → Availability**
2. Click **"Configure Pricing"** button
3. Set the four pricing parameters
4. See live preview for all party sizes
5. Click **"Save Pricing Config"**

The configuration is saved to:
- **Provider.defaultPricingRules** (for the provider's default)
- Applied to new **Availability** slots automatically

### 2. Creating Availability Slots

When creating new availability slots, the pricing configuration is automatically attached:

```json
{
  "pricingRules": "{\"type\":\"step-based\",\"soloPrice\":100,\"dropRatePercent\":10,\"minPricePerPerson\":50,\"minSessionEarnings\":100}"
}
```

### 3. Booking Price Calculation

When a booking is created, the system:

1. Reads the `pricingRules` from the availability slot
2. Parses the step-based configuration
3. Calculates the price using the algorithm above
4. Stores `pricePerPerson` and `totalPrice` in the booking

```typescript
// From booking API
const pricingRules = availability.pricingRules
  ? JSON.parse(availability.pricingRules)
  : null

const pricing = calculatePrice(partySize, pricingRules, fallbackPrice)

// pricing.pricePerPerson → saved to booking
// pricing.totalPrice → saved to booking
```

## Files Structure

```
types/
  └── pricing.ts                      # StepBasedPricing interface

lib/
  └── pricing.ts                      # calculateStepBasedPricing() function

app/
  ├── components/
  │   └── SimplePricingConfig.tsx     # UI for configuring step-based pricing
  │
  ├── admin/[tenantSlug]/providers/[id]/availability/
  │   └── page.tsx                    # Availability management with pricing config
  │
  └── api/
      ├── [tenantSlug]/
      │   ├── bookings/
      │   │   └── route.ts            # Uses step-based pricing when creating bookings
      │   └── providers/[id]/
      │       └── route.ts            # Saves defaultPricingRules to provider
      └── availability/
          └── bulk/
              └── route.ts            # Applies pricing rules to new availability slots
```

## Database Schema

### Provider
```prisma
model Provider {
  ...
  defaultPricingRules String?  // JSON string for default pricing configuration
  ...
}
```

### Availability
```prisma
model Availability {
  ...
  pricingRules    String?      // JSON string for flexible pricing rules
  ...
}
```

### ProviderService
```prisma
model ProviderService {
  ...
  pricingRules    String?      // JSON string for flexible pricing rules
  ...
}
```

## Validation Rules

The system validates pricing configuration to ensure:

1. **Solo price** must be > 0
2. **Drop rate** must be between 0% and 100%
3. **Min price per person** must be > 0
4. **Min price per person** cannot exceed solo price
5. **Min session earnings** cannot be negative
6. **Min session earnings** should not exceed solo price (otherwise single bookings would be cancelled)

## Visual Indicators

The SimplePricingConfig component shows:

- **Green rows**: Normal pricing - booking accepted
- **Yellow rows**: Floor price reached - per-person minimum applied
- **Red rows**: Below minimum earnings - booking would be cancelled
- **Blue divider lines**: New step boundaries (every 2 people)
- **Step labels**: Shows which step each party size belongs to

## Integration with Other Pricing Models

Step-based pricing is one of 6 pricing models supported:

1. **simple** - Fixed price per person
2. **tiered** - Different prices for different group sizes
3. **discount** - Percentage discounts for larger groups
4. **flat** - One price regardless of group size
5. **hybrid** - Combination of solo, group, and flat rates
6. **step-based** - Price drops every STEP_SIZE people (this model)

All models use the same `calculatePrice()` function in `lib/pricing.ts` which handles the type discrimination.

## Best Practices

1. **Set realistic floor prices** - Ensure minPricePerPerson covers your costs
2. **Test with preview** - Use the live preview to see pricing for all party sizes
3. **Align with capacity** - Consider your maxCapacity when setting drop rates
4. **Minimum earnings** - Set minSessionEarnings to ensure profitability
5. **Compound drops** - Remember that drops compound (10% per step means 19% off after 2 steps, 27% after 3 steps, etc.)

## Migration Path

### From Old Pricing System

If you have existing availability with old "progressive-drop" pricing:

```json
// Old format
{
  "type": "progressive-drop",
  "config": {
    "soloPrice": 100,
    "dropRatePercent": 10,
    "minPricePerPerson": 50,
    "minSessionEarnings": 100
  }
}
```

Convert to new format:

```json
// New format
{
  "type": "step-based",
  "soloPrice": 100,
  "dropRatePercent": 10,
  "minPricePerPerson": 50,
  "minSessionEarnings": 100
}
```

The system will handle both formats during transition.

## API Usage

### Get Price Preview

```bash
POST /api/pricing/preview
Content-Type: application/json

{
  "pricingRules": {
    "type": "step-based",
    "soloPrice": 100,
    "dropRatePercent": 10,
    "minPricePerPerson": 50,
    "minSessionEarnings": 100
  },
  "maxSize": 10
}
```

### Calculate Single Price

```typescript
import { calculatePrice } from '@/lib/pricing'

const rules = {
  type: 'step-based',
  soloPrice: 100,
  dropRatePercent: 10,
  minPricePerPerson: 50,
  minSessionEarnings: 100
}

const pricing = calculatePrice(5, rules)
// {
//   totalPrice: 405,
//   pricePerPerson: 81,
//   breakdown: "5 × $81 (step 2)",
//   appliedRule: "step-based",
//   savings: 95
// }
```

## Troubleshooting

### Issue: Prices not calculating correctly
- Check that pricingRules is valid JSON
- Verify the type is exactly "step-based"
- Ensure all required fields are present

### Issue: Configuration not saving
- Check browser console for errors
- Verify provider API endpoint is accessible
- Ensure you have admin permissions

### Issue: Preview showing unexpected results
- Remember: drops are compound, not additive
- Check floor price isn't set too high
- Verify minimum earnings makes sense for group sizes

## Future Enhancements

Potential improvements:

- **Variable step sizes** - Different STEP_SIZE for different providers
- **Non-linear drops** - Different drop rates at different steps
- **Time-based modifiers** - Peak hours pricing
- **Seasonal adjustments** - Holiday/weekend rates
