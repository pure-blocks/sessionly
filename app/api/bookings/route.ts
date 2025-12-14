import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getPriceFromTable, calculateDuration, getSessionTypeFromPartySize } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const trainerId = searchParams.get('trainerId')
    const clientEmail = searchParams.get('clientEmail')

    const where: Prisma.BookingWhereInput = {}

    if (trainerId) {
      where.trainerId = trainerId
    }

    if (clientEmail) {
      where.clientEmail = clientEmail
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        provider: true,
        availability: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(bookings)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is logged in
    const session = await getServerSession(authOptions)

    const body = await request.json()
    const {
      availabilityId,
      clientName,
      clientEmail,
      notes,
      partySize = 1,
      openToSharing = false,
      sessionType,
      sessionPrice
    } = body

    // Check if availability exists and has capacity
    const availability = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: {
        bookings: true,
        provider: true,
      }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
    }

    if (!availability.provider && !availability.trainerId) {
      return NextResponse.json({ error: 'Provider information not found' }, { status: 400 })
    }

    // Check if slot has enough capacity for the party size
    const spotsLeft = availability.maxCapacity - availability.currentBookings
    if (partySize > spotsLeft) {
      return NextResponse.json({
        error: `Not enough spots available. Only ${spotsLeft} spot(s) remaining`
      }, { status: 400 })
    }

    // Check if logged-in user is a client of this provider
    let clientRecord = null
    let finalClientName = clientName
    let finalClientEmail = clientEmail
    let appliedCustomPricing = false

    if (session?.user?.email) {
      // Look up client record by email and provider
      const providerId = availability.providerId

      if (providerId) {
        clientRecord = await prisma.client.findFirst({
          where: {
            email: session.user.email.toLowerCase(),
            providerId: providerId,
            isActive: true,
          }
        })

        if (clientRecord) {
          // Use client's information from their record
          finalClientName = clientRecord.name
          finalClientEmail = clientRecord.email
          appliedCustomPricing = true
        }
      }
    }

    // Calculate session duration and type
    const duration = calculateDuration(availability.startTime, availability.endTime)
    const determinedSessionType = sessionType || getSessionTypeFromPartySize(partySize)

    // Calculate price based on pricing tables
    let pricePerPerson = sessionPrice ? sessionPrice / partySize : null
    let totalPrice = sessionPrice

    // Try to get price from client's pricing table first
    if (clientRecord?.pricingTable) {
      const clientPrice = getPriceFromTable(
        clientRecord.pricingTable as Record<string, number>,
        determinedSessionType,
        duration
      )
      if (clientPrice !== null) {
        totalPrice = clientPrice
        pricePerPerson = totalPrice / partySize
        appliedCustomPricing = true
      }
    }

    // Fall back to availability's pricing table if no custom pricing
    if (!appliedCustomPricing && availability.pricingTable) {
      const availabilityPrice = getPriceFromTable(
        availability.pricingTable as Record<string, number>,
        determinedSessionType,
        duration
      )
      if (availabilityPrice !== null) {
        totalPrice = availabilityPrice
        pricePerPerson = totalPrice / partySize
      }
    }

    // Create booking and update availability in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Update availability with new booking count and price if not set
      await tx.availability.update({
        where: { id: availabilityId },
        data: {
          currentBookings: { increment: partySize },
          // Set price on first booking if not already set
          ...(availability.price === null && totalPrice ? { price: totalPrice } : {})
        }
      })

      // Create new booking
      return tx.booking.create({
        data: {
          availabilityId,
          trainerId: availability.trainerId,
          providerId: availability.providerId,
          tenantId: availability.provider?.tenantId,
          clientId: clientRecord?.id,
          clientName: finalClientName,
          clientEmail: finalClientEmail,
          notes,
          partySize,
          openToSharing,
          pricePerPerson,
          totalPrice,
        },
        include: {
          provider: true,
          availability: true,
          client: {
            select: {
              id: true,
              name: true,
              pricingTable: true,
            }
          }
        }
      })
    })

    return NextResponse.json({
      ...booking,
      appliedCustomPricing,
    }, { status: 201 })
  } catch (error) {
    console.error('Booking error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
