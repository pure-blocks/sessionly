import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function inspectDatabase() {
  try {
    console.log('\n📊 DATABASE INSPECTION\n')
    console.log('='.repeat(50))

    // Count records
    const userCount = await prisma.user.count()
    const tenantCount = await prisma.tenant.count()
    const providerCount = await prisma.provider.count()
    const bookingCount = await prisma.booking.count()
    const availabilityCount = await prisma.availability.count()

    console.log('\n📈 Record Counts:')
    console.log(`  Users:        ${userCount}`)
    console.log(`  Tenants:      ${tenantCount}`)
    console.log(`  Providers:    ${providerCount}`)
    console.log(`  Bookings:     ${bookingCount}`)
    console.log(`  Availability: ${availabilityCount}`)

    // Recent users
    console.log('\n👤 Recent Users:')
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
    console.table(users)

    // Tenants
    if (tenantCount > 0) {
      console.log('\n🏢 Tenants:')
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true,
        },
      })
      console.table(tenants)
    }

    // Providers
    if (providerCount > 0) {
      console.log('\n👨‍⚕️ Providers:')
      const providers = await prisma.provider.findMany({
        take: 10,
        include: {
          providerType: {
            select: { name: true },
          },
          tenant: {
            select: { name: true },
          },
        },
      })

      const providersTable = providers.map(p => ({
        id: p.id.substring(0, 8) + '...',
        name: p.name,
        email: p.email,
        type: p.providerType.name,
        tenant: p.tenant.name,
        active: p.isActive,
      }))
      console.table(providersTable)
    }

    // Recent bookings
    if (bookingCount > 0) {
      console.log('\n📅 Recent Bookings:')
      const bookings = await prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: { name: true },
          },
          availability: {
            select: { date: true, startTime: true },
          },
        },
      })

      const bookingsTable = bookings.map(b => ({
        id: b.id.substring(0, 8) + '...',
        client: b.clientName,
        provider: b.provider?.name || 'N/A',
        date: b.availability.date.toISOString().split('T')[0],
        time: b.availability.startTime,
        status: b.status,
      }))
      console.table(bookingsTable)
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ Inspection complete!\n')
  } catch (error) {
    console.error('❌ Error inspecting database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

inspectDatabase()
