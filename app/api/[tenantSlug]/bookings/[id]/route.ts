import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTenantOwnership } from '@/lib/tenant-context'
import { sendBookingCancellationToClient, sendBookingCancellationToProvider } from '@/lib/email'
import { format } from 'date-fns'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tenantSlug: string; id: string } }
) {
  try {
    const body = await request.json()

    // Verify the booking belongs to this tenant
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
    })

    if (!booking) {
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
      where: { id: params.id },
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
  } catch (error: any) {
    console.error('Booking update error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking', details: error.message },
      { status: 500 }
    )
  }
}
