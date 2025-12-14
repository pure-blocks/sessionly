import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'
import { sendBookingConfirmationToClient, sendBookingNotificationToProvider } from '@/lib/email'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest
) {
  try {
    const { tenantId } = await getTenantContext()
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const status = searchParams.get('status')

    const where: Prisma.BookingWhereInput = { tenantId }

    if (providerId) {
      where.providerId = providerId
    }

    if (status) {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
        availability: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ bookings })
  } catch (error: unknown) {
    console.error('Bookings fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await request.json()
    const {
      availabilityId,
      clientName,
      clientEmail,
      clientPhone,
      notes,
      partySize = 1,
      openToSharing = false,
      sessionPrice
    } = body

    // Check if availability exists and has capacity
    const availability = await prisma.availability.findUnique({
      where: { id: availabilityId },
      include: {
        bookings: true,
        provider: true
      }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability slot not found' }, { status: 404 })
    }

    // Verify this availability belongs to the current tenant
    if (availability.provider && availability.provider.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
    }

    // Check if slot has enough capacity for the party size
    const spotsLeft = availability.maxCapacity - availability.currentBookings
    if (partySize > spotsLeft) {
      return NextResponse.json({
        error: `Not enough spots available. Only ${spotsLeft} spot(s) remaining`
      }, { status: 400 })
    }

    // Simple pricing calculation (TODO: Use pricing table)
    const basePrice = sessionPrice || availability.price || 0
    const pricePerPerson = basePrice / partySize
    const totalPrice = basePrice

    // Create booking and update availability in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Update availability with new booking count
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
          tenantId,
          availabilityId,
          providerId: availability.providerId,
          trainerId: availability.trainerId, // backward compatibility
          clientName,
          clientEmail,
          clientPhone,
          notes,
          partySize,
          openToSharing,
          pricePerPerson,
          totalPrice,
          status: 'confirmed'
        },
        include: {
          provider: true,
          availability: true,
          tenant: true
        }
      })
    })

    // Send confirmation emails (async, don't wait for completion)
    if (booking.provider && booking.tenant) {
      const emailData = {
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        providerName: booking.provider.name,
        providerEmail: booking.provider.email,
        date: format(new Date(booking.availability.date), 'MMMM d, yyyy'),
        startTime: booking.availability.startTime,
        endTime: booking.availability.endTime,
        partySize: booking.partySize,
        totalPrice: booking.totalPrice || undefined,
        notes: booking.notes || undefined,
        tenantName: booking.tenant.name,
        bookingId: booking.id,
      }

      // Send emails without blocking the response
      Promise.all([
        sendBookingConfirmationToClient(emailData),
        sendBookingNotificationToProvider(emailData),
      ]).catch(error => {
        console.error('Failed to send booking emails:', error)
      })
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (error: unknown) {
    console.error('Booking error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create booking', details: errorMessage },
      { status: 500 }
    )
  }
}
