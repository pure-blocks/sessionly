import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantOwnership } from '@/lib/tenant-context'
import { sendBookingCancellationToClient, sendBookingCancellationToProvider } from '@/lib/email'
import { format } from 'date-fns'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify the booking belongs to this tenant
    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking || !booking.tenantId) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    await verifyTenantOwnership(booking.tenantId)

    // Check if this is a cancellation
    const isCancellation = body.status === 'cancelled' && booking.status !== 'cancelled'

    // Update the booking
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...body,
        ...(isCancellation ? { cancelledAt: new Date() } : {}),
      },
      include: {
        provider: true,
        availability: true,
        tenant: true,
      },
    })

    // Send cancellation emails if booking was cancelled
    if (isCancellation && updated.provider && updated.tenant) {
      const emailData = {
        clientName: updated.clientName,
        clientEmail: updated.clientEmail,
        providerName: updated.provider.name,
        providerEmail: updated.provider.email,
        date: format(new Date(updated.availability.date), 'MMMM d, yyyy'),
        startTime: updated.availability.startTime,
        endTime: updated.availability.endTime,
        reason: updated.cancellationReason || undefined,
        tenantName: updated.tenant.name,
        bookingId: updated.id,
      }

      // Send emails without blocking the response
      Promise.all([
        sendBookingCancellationToClient(emailData),
        sendBookingCancellationToProvider(emailData),
      ]).catch(error => {
        console.error('Failed to send cancellation emails:', error)
      })
    }

    return NextResponse.json({ booking: updated })
  } catch (error: unknown) {
    console.error('Booking update error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update booking', details: errorMessage },
      { status: 500 }
    )
  }
}
