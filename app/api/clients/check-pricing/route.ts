import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/clients/check-pricing?providerId=xxx
 * Check if logged-in user has custom pricing with a provider
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({
        hasCustomPricing: false,
        message: 'Not logged in'
      })
    }

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    // Check if user is a client of this provider
    const clientRecord = await prisma.client.findFirst({
      where: {
        email: session.user.email.toLowerCase(),
        providerId: providerId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        pricingTable: true,
        pricingNotes: true,
        provider: {
          select: {
            name: true,
          }
        }
      }
    })

    if (!clientRecord) {
      return NextResponse.json({
        hasCustomPricing: false,
        message: 'No client record found'
      })
    }

    return NextResponse.json({
      hasCustomPricing: !!clientRecord.pricingTable,
      clientInfo: {
        name: clientRecord.name,
        pricingTable: clientRecord.pricingTable,
        pricingNotes: clientRecord.pricingNotes,
      }
    })
  } catch (error) {
    console.error('Check pricing error:', error)
    return NextResponse.json(
      { error: 'Failed to check pricing' },
      { status: 500 }
    )
  }
}
