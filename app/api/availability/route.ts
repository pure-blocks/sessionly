import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const trainerId = searchParams.get('trainerId')
    const providerId = searchParams.get('providerId')
    const dates = searchParams.get('dates')
    const date = searchParams.get('date')
    const available = searchParams.get('available')

    const where: Prisma.AvailabilityWhereInput = {}

    // Support both providerId and trainerId (backward compatibility)
    const id = providerId || trainerId
    if (id) {
      where.OR = [
        { trainerId: id },
        { providerId: id }
      ]
    }

    // Support multiple dates for duplicate checking
    if (dates) {
      const dateList = dates.split(',').map(d => {
        const date = new Date(d)
        date.setHours(0, 0, 0, 0)
        return date
      })
      where.date = { in: dateList }
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      where.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    let availability = await prisma.availability.findMany({
      where,
      include: {
        provider: true,
        bookings: {
          select: {
            id: true,
            partySize: true,
            openToSharing: true,
            pricePerPerson: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    // Filter for available slots if requested
    if (available === 'true') {
      availability = availability.filter(slot => {
        // Show if there's capacity
        if (slot.currentBookings < slot.maxCapacity) {
          // Show if empty OR if someone is open to sharing
          return slot.currentBookings === 0 || slot.bookings.some(b => b.openToSharing)
        }
        return false
      })
    }

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Availability fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trainerId, date, startTime, endTime } = body

    // Validate that the trainer exists
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId }
    })

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    // Validate duration is exactly 1 hour
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    const durationMinutes = endTotalMinutes - startTotalMinutes

    if (durationMinutes !== 60) {
      return NextResponse.json({ error: 'Sessions must be exactly 1 hour long' }, { status: 400 })
    }

    const availability = await prisma.availability.create({
      data: {
        providerId: trainerId,  // Use providerId (trainerId is legacy parameter name)
        date: new Date(date),
        startTime,
        endTime,
        isGroupSession: false,  // Default to individual sessions
        maxCapacity: 1,         // Default to 1 person
        currentBookings: 0
      },
      include: {
        provider: true
      }
    })

    return NextResponse.json(availability, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
  }
}
