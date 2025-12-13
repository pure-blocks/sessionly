import { PrismaClient } from '@prisma/client'
import { generateUniqueTenantSlug, generateUniqueProviderTypeSlug } from '../lib/slug'

const prisma = new PrismaClient()

interface TenantInput {
  name: string
  email: string
  slug?: string
  description?: string
  phone?: string
  website?: string
  primaryColor?: string
  secondaryColor?: string
  timezone?: string
  currency?: string
  providerTypeName?: string
  providerTypeNameSingular?: string
  providerTypeDescription?: string
}

async function createTenant(input: TenantInput) {
  console.log('\n🚀 Creating new tenant...\n')

  try {
    // Generate unique slug
    const tenantSlug = input.slug || (await generateUniqueTenantSlug(input.name))

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (existingTenant) {
      console.error(`❌ Error: Tenant with slug "${tenantSlug}" already exists`)
      process.exit(1)
    }

    // Create tenant with config and provider type in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: input.name,
          slug: tenantSlug,
          email: input.email,
          description: input.description || null,
          phone: input.phone || null,
          website: input.website || null,
          primaryColor: input.primaryColor || '#3B82F6',
          secondaryColor: input.secondaryColor || '#10B981',
          timezone: input.timezone || 'UTC',
          currency: input.currency || 'USD',
          isActive: true,
        },
      })

      console.log(`✓ Tenant created: ${newTenant.name}`)
      console.log(`  Slug: ${newTenant.slug}`)
      console.log(`  ID: ${newTenant.id}`)

      // Create default tenant config
      await tx.tenantConfig.create({
        data: {
          tenantId: newTenant.id,
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

      console.log(`✓ Tenant config created`)

      // Create default provider type
      const providerTypeName = input.providerTypeName || 'Service Providers'
      const providerTypeSlug = await generateUniqueProviderTypeSlug(
        providerTypeName,
        newTenant.id
      )

      const providerType = await tx.providerType.create({
        data: {
          tenantId: newTenant.id,
          name: providerTypeName,
          nameSingular: input.providerTypeNameSingular || providerTypeName,
          slug: providerTypeSlug,
          description: input.providerTypeDescription || null,
          icon: '👤',
          defaultSlotDuration: 60,
          defaultSlotCapacity: 1,
          allowGroupSessions: false,
          requireApproval: false,
          isActive: true,
          displayOrder: 0,
        },
      })

      console.log(`✓ Provider type created: ${providerType.name}`)

      return newTenant
    })

    console.log('\n✅ Tenant onboarding completed!\n')
    console.log('📋 Details:')
    console.log(`   Name: ${tenant.name}`)
    console.log(`   Slug: ${tenant.slug}`)
    console.log(`   Email: ${tenant.email}`)
    console.log(`\n🔗 URLs:`)
    console.log(`   Public Booking: /${tenant.slug}/book`)
    console.log(`   Admin Portal: /admin/${tenant.slug}`)
    console.log(`\n💡 Next Steps:`)
    console.log(`   1. Add providers via API or admin portal`)
    console.log(`   2. Configure availability slots`)
    console.log(`   3. Share the booking URL with clients`)

    return tenant
  } catch (error) {
    console.error('\n❌ Error creating tenant:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Example usage - you can modify these values
const tenantData: TenantInput = {
  name: process.argv[2] || 'Acme Fitness',
  email: process.argv[3] || 'admin@acmefitness.com',
  slug: process.argv[4],
  description: 'Professional fitness and wellness services',
  phone: '+1-555-0123',
  website: 'https://acmefitness.com',
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  timezone: 'America/New_York',
  currency: 'USD',
  providerTypeName: 'Personal Trainers',
  providerTypeNameSingular: 'Personal Trainer',
  providerTypeDescription: 'Certified fitness and wellness trainers',
}

// Run if called directly
if (require.main === module) {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TENANT ONBOARDING SCRIPT              ║')
  console.log('╚══════════════════════════════════════════╝')

  createTenant(tenantData)
    .then(() => {
      console.log('\n✨ Done!\n')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { createTenant }
