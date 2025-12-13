import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice, getPricingPreview } from '@/lib/pricing'
import { PricingRules } from '@/types/pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pricingRules, partySize, maxSize, fallbackPrice } = body

    // Single calculation
    if (partySize) {
      const pricing = calculatePrice(
        partySize,
        pricingRules as PricingRules | null,
        fallbackPrice
      )
      return NextResponse.json({ pricing })
    }

    // Preview for multiple sizes
    if (maxSize) {
      const preview = getPricingPreview(
        pricingRules as PricingRules | null,
        maxSize,
        fallbackPrice
      )
      return NextResponse.json({ preview })
    }

    return NextResponse.json(
      { error: 'Either partySize or maxSize is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Pricing preview error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate pricing', details: error.message },
      { status: 500 }
    )
  }
}
