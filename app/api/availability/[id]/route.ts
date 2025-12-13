import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Check if the availability exists
    const availability = await prisma.availability.findUnique({
      where: { id }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
    }

    // Build update data object - only include fields that are provided
    const updateData: any = {}

    if (body.startTime !== undefined) updateData.startTime = body.startTime
    if (body.endTime !== undefined) updateData.endTime = body.endTime
    if (body.isGroupSession !== undefined) {
      updateData.isGroupSession = body.isGroupSession
      // If disabling group session, set capacity to 1
      if (!body.isGroupSession) {
        updateData.maxCapacity = 1
      }
    }
    if (body.maxCapacity !== undefined) updateData.maxCapacity = body.maxCapacity
    if (body.price !== undefined) updateData.price = body.price
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Update the availability slot
    const updated = await prisma.availability.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Availability updated successfully',
      availability: updated
    }, { status: 200 })
  } catch (error) {
    console.error('Update availability error:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if the availability exists and has no bookings
    const availability = await prisma.availability.findUnique({
      where: { id },
      include: {
        bookings: true
      }
    })

    if (!availability) {
      return NextResponse.json({ error: 'Availability not found' }, { status: 404 })
    }

    if (availability.currentBookings > 0 || availability.bookings.length > 0) {
      return NextResponse.json({ error: 'Cannot delete slot with existing bookings' }, { status: 400 })
    }

    // Delete the availability slot
    await prisma.availability.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Availability deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Delete availability error:', error)
    return NextResponse.json({ error: 'Failed to delete availability' }, { status: 500 })
  }
}
