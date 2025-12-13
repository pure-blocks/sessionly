import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  try {
    const { tenantSlug } = params
    const body = await request.json()
    const { type } = body

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let deletedCount = 0
    let message = ''

    switch (type) {
      case 'delete-past-empty-availability':
        // Delete past availability slots with no bookings
        const pastEmptyResult = await prisma.availability.deleteMany({
          where: {
            provider: { tenantId: tenant.id },
            date: { lt: today },
            currentBookings: 0
          }
        })
        deletedCount = pastEmptyResult.count
        message = `Deleted ${deletedCount} past empty availability slots`
        break

      case 'delete-all-empty-availability':
        // Delete all availability slots with no bookings (past and future)
        const allEmptyResult = await prisma.availability.deleteMany({
          where: {
            provider: { tenantId: tenant.id },
            currentBookings: 0
          }
        })
        deletedCount = allEmptyResult.count
        message = `Deleted ${deletedCount} empty availability slots`
        break

      case 'delete-all-availability':
        // First delete all bookings
        const bookingsResult = await prisma.booking.deleteMany({
          where: {
            availability: {
              provider: { tenantId: tenant.id }
            }
          }
        })

        // Then delete all availability
        const allAvailabilityResult = await prisma.availability.deleteMany({
          where: {
            provider: { tenantId: tenant.id }
          }
        })

        deletedCount = allAvailabilityResult.count
        message = `Deleted ${bookingsResult.count} bookings and ${deletedCount} availability slots`
        break

      case 'delete-past-bookings':
        // Delete bookings for past dates
        const pastBookingsResult = await prisma.booking.deleteMany({
          where: {
            availability: {
              provider: { tenantId: tenant.id },
              date: { lt: today }
            }
          }
        })

        // Update currentBookings count for affected availability slots
        await prisma.$executeRaw`
          UPDATE Availability
          SET currentBookings = (
            SELECT COUNT(*)
            FROM Booking
            WHERE Booking.availabilityId = Availability.id
          )
          WHERE providerId IN (
            SELECT id FROM Provider WHERE tenantId = ${tenant.id}
          )
        `

        deletedCount = pastBookingsResult.count
        message = `Deleted ${deletedCount} past bookings`
        break

      case 'delete-all-data':
        // Complete database reset - delete all tenant data
        // Order matters due to foreign key constraints

        // 1. Delete all bookings
        const allBookings = await prisma.booking.deleteMany({
          where: { tenantId: tenant.id }
        })

        // 2. Delete all availability
        const allAvailability = await prisma.availability.deleteMany({
          where: {
            provider: { tenantId: tenant.id }
          }
        })

        // 3. Delete all provider services
        const allProviderServices = await prisma.providerService.deleteMany({
          where: {
            provider: { tenantId: tenant.id }
          }
        })

        // 4. Delete all providers
        const allProviders = await prisma.provider.deleteMany({
          where: { tenantId: tenant.id }
        })

        // 5. Delete all service templates
        const allServiceTemplates = await prisma.serviceTemplate.deleteMany({
          where: {
            providerType: { tenantId: tenant.id }
          }
        })

        // 6. Delete all provider types
        const allProviderTypes = await prisma.providerType.deleteMany({
          where: { tenantId: tenant.id }
        })

        // 7. Delete all categories
        const allCategories = await prisma.category.deleteMany({
          where: { tenantId: tenant.id }
        })

        message = `Complete reset: Deleted ${allBookings.count} bookings, ${allAvailability.count} availability slots, ${allProviderServices.count} provider services, ${allProviders.count} providers, ${allServiceTemplates.count} service templates, ${allProviderTypes.count} provider types, ${allCategories.count} categories`
        deletedCount = allBookings.count + allAvailability.count + allProviderServices.count + allProviders.count + allServiceTemplates.count + allProviderTypes.count + allCategories.count
        break

      default:
        return NextResponse.json({ error: 'Invalid cleanup type' }, { status: 400 })
    }

    return NextResponse.json({
      message,
      deletedCount
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
