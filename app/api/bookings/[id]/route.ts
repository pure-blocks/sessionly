import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        provider: true,
        availability: true
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { clientName, clientEmail, notes } = body

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(clientName && { clientName }),
        ...(clientEmail && { clientEmail }),
        ...(notes !== undefined && { notes })
      },
      include: {
        provider: true,
        availability: true
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete booking and update availability in a transaction
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id }
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      // Delete the booking
      await tx.booking.delete({
        where: { id }
      })

      // Decrement current bookings count
      await tx.availability.update({
        where: { id: booking.availabilityId },
        data: {
          currentBookings: {
            decrement: 1
          }
        }
      })
    })

    return NextResponse.json({ message: 'Booking cancelled successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
