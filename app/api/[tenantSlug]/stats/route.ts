import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  try {
    const { tenantSlug } = params

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Count providers
    const providers = await prisma.provider.count({
      where: { tenantId: tenant.id }
    })

    // Count all availability
    const availability = await prisma.availability.count({
      where: {
        provider: { tenantId: tenant.id }
      }
    })

    // Count past availability
    const availabilityPast = await prisma.availability.count({
      where: {
        provider: { tenantId: tenant.id },
        date: { lt: today }
      }
    })

    // Count future availability
    const availabilityFuture = await prisma.availability.count({
      where: {
        provider: { tenantId: tenant.id },
        date: { gte: today }
      }
    })

    // Count empty availability (no bookings)
    const availabilityEmpty = await prisma.availability.count({
      where: {
        provider: { tenantId: tenant.id },
        currentBookings: 0
      }
    })

    // Count all bookings
    const bookings = await prisma.booking.count({
      where: {
        availability: {
          provider: { tenantId: tenant.id }
        }
      }
    })

    // Count past bookings
    const bookingsPast = await prisma.booking.count({
      where: {
        availability: {
          provider: { tenantId: tenant.id },
          date: { lt: today }
        }
      }
    })

    // Count future bookings
    const bookingsFuture = await prisma.booking.count({
      where: {
        availability: {
          provider: { tenantId: tenant.id },
          date: { gte: today }
        }
      }
    })

    return NextResponse.json({
      providers,
      availability,
      availabilityPast,
      availabilityFuture,
      availabilityEmpty,
      bookings,
      bookingsPast,
      bookingsFuture,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
