import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TimeSlot {
  startTime: string
  endTime: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      trainerId,
      providerId,
      dates,
      timeSlots,
      isGroupSession = false,
      maxCapacity = 1,
      price = null
    } = body as {
      trainerId?: string
      providerId?: string
      dates: string[]
      timeSlots: TimeSlot[]
      isGroupSession?: boolean
      maxCapacity?: number
      price?: number | null
    }

    // Support both trainerId (legacy) and providerId (new multi-tenant)
    const id = providerId || trainerId

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
    }

    // Try to find provider first (new model), fallback to trainer (legacy)
    let exists = false

    try {
      const provider = await prisma.provider.findUnique({
        where: { id }
      })
      exists = !!provider
    } catch {
      // If Provider model doesn't exist or fails, try Trainer
      const trainer = await prisma.trainer.findUnique({
        where: { id }
      })
      exists = !!trainer
    }

    if (!exists) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    // Check for existing slots to avoid duplicates
    const existingSlots = await prisma.availability.findMany({
      where: {
        OR: [
          { providerId: id },
          { trainerId: id }
        ],
        date: {
          in: dates.map(d => new Date(d))
        }
      },
      select: {
        date: true,
        startTime: true,
        endTime: true
      }
    })

    // Create a Set of existing slot keys for fast lookup
    const existingSlotKeys = new Set(
      existingSlots.map(slot =>
        `${new Date(slot.date).toISOString().split('T')[0]}_${slot.startTime}_${slot.endTime}`
      )
    )

    // Filter out slots that already exist
    const slotsToCreate = dates.flatMap((date) =>
      timeSlots
        .filter(slot => {
          const slotKey = `${date}_${slot.startTime}_${slot.endTime}`
          return !existingSlotKeys.has(slotKey)
        })
        .map((slot) => ({
          providerId: id,
          trainerId: id, // For backward compatibility
          date: new Date(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isGroupSession,
          maxCapacity: isGroupSession ? maxCapacity : 1,
          currentBookings: 0,
          price
        }))
    )

    if (slotsToCreate.length === 0) {
      return NextResponse.json({
        message: 'All slots already exist',
        count: 0,
        skipped: existingSlots.length
      }, { status: 200 })
    }

    // Create only non-duplicate slots
    const createdSlots = await prisma.availability.createMany({
      data: slotsToCreate
    })

    const skippedCount = (dates.length * timeSlots.length) - slotsToCreate.length

    return NextResponse.json({
      message: `Successfully created ${createdSlots.count} availability slots${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''}`,
      count: createdSlots.count,
      skipped: skippedCount
    }, { status: 201 })
  } catch (error) {
    console.error('Bulk availability creation error:', error)
    return NextResponse.json({ error: 'Failed to create bulk availability' }, { status: 500 })
  }
}
