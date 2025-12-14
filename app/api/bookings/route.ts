import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
        bookings: true
      }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
    }

    // Check if slot has enough capacity for the party size
    const spotsLeft = availability.maxCapacity - availability.currentBookings
    if (partySize > spotsLeft) {
      return NextResponse.json({
        error: `Not enough spots available. Only ${spotsLeft} spot(s) remaining`
      }, { status: 400 })
    }

    // Calculate price per person based on session type
    const pricePerPerson = sessionPrice ? sessionPrice / partySize : null

    // Create booking and update availability in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Update availability with new booking count and price if not set
      await tx.availability.update({
        where: { id: availabilityId },
        data: {
          currentBookings: { increment: partySize },
          // Set price on first booking if not already set
          ...(availability.price === null && sessionPrice ? { price: sessionPrice } : {})
        }
      })

      // Create new booking
      return tx.booking.create({
        data: {
          availabilityId,
          trainerId: availability.trainerId,
          clientName,
          clientEmail,
          notes,
          partySize,
          openToSharing,
          pricePerPerson
        },
        include: {
          provider: true,
          availability: true
        }
      })
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Booking error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
