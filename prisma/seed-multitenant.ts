import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function migrateToMultiTenant() {
  console.log('Starting multi-tenant data migration...')

  try {
    // Step 1: Create default tenant
    console.log('\n1. Creating default tenant...')
    const defaultTenant = await prisma.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        name: 'Default Organization',
        slug: 'default',
        email: 'admin@example.com',
        description: 'Default organization for migrated data',
        isActive: true,
        timezone: 'UTC',
        currency: 'USD',
      },
    })
    console.log(`✓ Default tenant created: ${defaultTenant.name} (${defaultTenant.slug})`)

    // Step 2: Create default tenant config
    console.log('\n2. Creating default tenant config...')
    const config = await prisma.tenantConfig.upsert({
      where: { tenantId: defaultTenant.id },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        minBookingNotice: 60,
        maxBookingAdvance: 90,
        allowCancellation: true,
        cancellationWindow: 24,
        defaultSlotDuration: 60,
        slotBuffer: 0,
        sendConfirmationEmail: true,
        sendReminderEmail: true,
        reminderHoursBefore: 24,
      },
    })
    console.log(`✓ Default tenant config created`)

    // Step 3: Create default provider type
    console.log('\n3. Creating default provider type...')
    const trainerType = await prisma.providerType.upsert({
      where: {
        tenantId_slug: {
          tenantId: defaultTenant.id,
          slug: 'trainers',
        },
      },
      update: {},
      create: {
        tenantId: defaultTenant.id,
        name: 'Personal Trainers',
        nameSingular: 'Personal Trainer',
        slug: 'trainers',
        description: 'Fitness and wellness trainers',
        icon: '💪',
        defaultSlotDuration: 60,
        defaultSlotCapacity: 4,
        allowGroupSessions: true,
        requireApproval: false,
        isActive: true,
        displayOrder: 0,
      },
    })
    console.log(`✓ Provider type created: ${trainerType.name}`)

    // Step 4: Migrate trainers to providers
    console.log('\n4. Migrating trainers to providers...')
    const trainers = await prisma.trainer.findMany()
    console.log(`Found ${trainers.length} trainers to migrate`)

    const trainerToProviderMap = new Map<string, string>()

    for (const trainer of trainers) {
      const slug = generateSlug(trainer.name)
      let finalSlug = slug
      let counter = 1

      // Ensure unique slug
      while (
        await prisma.provider.findFirst({
          where: { tenantId: defaultTenant.id, slug: finalSlug },
        })
      ) {
        finalSlug = `${slug}-${counter}`
        counter++
      }

      const provider = await prisma.provider.create({
        data: {
          tenantId: defaultTenant.id,
          providerTypeId: trainerType.id,
          name: trainer.name,
          email: trainer.email,
          bio: trainer.bio,
          slug: finalSlug,
          isActive: true,
          acceptingBookings: true,
          customFields: trainer.rateCard
            ? JSON.stringify({ rateCard: trainer.rateCard })
            : null,
        },
      })

      trainerToProviderMap.set(trainer.id, provider.id)
      console.log(`  ✓ Migrated: ${trainer.name} → ${provider.slug}`)
    }

    // Step 5: Update availability records
    console.log('\n5. Updating availability records...')
    const availabilities = await prisma.availability.findMany({
      where: { trainerId: { not: null } },
    })
    console.log(`Found ${availabilities.length} availability records to update`)

    let updatedAvailability = 0
    for (const availability of availabilities) {
      if (availability.trainerId) {
        const providerId = trainerToProviderMap.get(availability.trainerId)
        if (providerId) {
          await prisma.availability.update({
            where: { id: availability.id },
            data: { providerId },
          })
          updatedAvailability++
        } else {
          console.warn(
            `  ⚠ Warning: No provider found for trainer ${availability.trainerId}`
          )
        }
      }
    }
    console.log(`  ✓ Updated ${updatedAvailability} availability records`)

    // Step 6: Update booking records
    console.log('\n6. Updating booking records...')
    const bookings = await prisma.booking.findMany({
      where: { trainerId: { not: null } },
    })
    console.log(`Found ${bookings.length} booking records to update`)

    let updatedBookings = 0
    for (const booking of bookings) {
      if (booking.trainerId) {
        const providerId = trainerToProviderMap.get(booking.trainerId)
        if (providerId) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              tenantId: defaultTenant.id,
              providerId,
              totalPrice: booking.pricePerPerson
                ? booking.pricePerPerson * booking.partySize
                : null,
            },
          })
          updatedBookings++
        } else {
          console.warn(
            `  ⚠ Warning: No provider found for trainer ${booking.trainerId}`
          )
        }
      }
    }
    console.log(`  ✓ Updated ${updatedBookings} booking records`)

    // Step 7: Summary
    console.log('\n✅ Migration completed successfully!')
    console.log('\nSummary:')
    console.log(`  - Tenants created: 1`)
    console.log(`  - Provider types created: 1`)
    console.log(`  - Providers migrated: ${trainers.length}`)
    console.log(`  - Availability records updated: ${updatedAvailability}`)
    console.log(`  - Booking records updated: ${updatedBookings}`)

    // Step 8: Verification
    console.log('\n📊 Verification:')
    const stats = {
      tenants: await prisma.tenant.count(),
      providerTypes: await prisma.providerType.count(),
      providers: await prisma.provider.count(),
      availabilityWithProvider: await prisma.availability.count({
        where: { providerId: { not: null } },
      }),
      bookingsWithTenant: await prisma.booking.count({
        where: { tenantId: { not: null } },
      }),
    }
    console.log(`  - Total tenants: ${stats.tenants}`)
    console.log(`  - Total provider types: ${stats.providerTypes}`)
    console.log(`  - Total providers: ${stats.providers}`)
    console.log(
      `  - Availability with provider: ${stats.availabilityWithProvider}`
    )
    console.log(`  - Bookings with tenant: ${stats.bookingsWithTenant}`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateToMultiTenant()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
