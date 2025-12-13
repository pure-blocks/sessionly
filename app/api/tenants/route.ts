import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateUniqueTenantSlug, generateUniqueProviderTypeSlug } from '@/lib/slug'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      email,
      slug,
      description,
      phone,
      website,
      primaryColor,
      secondaryColor,
      timezone,
      currency,
      // Initial provider type (optional)
      providerTypeName,
      providerTypeNameSingular,
      providerTypeDescription,
    } = body

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Generate unique slug
    const tenantSlug = slug || (await generateUniqueTenantSlug(name))

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: `Tenant with slug "${tenantSlug}" already exists` },
        { status: 409 }
      )
    }

    // Create tenant with default config and provider type
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug: tenantSlug,
          email,
          description: description || null,
          phone: phone || null,
          website: website || null,
          primaryColor: primaryColor || '#3B82F6',
          secondaryColor: secondaryColor || '#10B981',
          timezone: timezone || 'UTC',
          currency: currency || 'USD',
          isActive: true,
        },
      })

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

      // Create default provider type if specified
      if (providerTypeName) {
        const providerTypeSlug = await generateUniqueProviderTypeSlug(
          providerTypeName,
          newTenant.id
        )

        await tx.providerType.create({
          data: {
            tenantId: newTenant.id,
            name: providerTypeName,
            nameSingular: providerTypeNameSingular || providerTypeName,
            slug: providerTypeSlug,
            description: providerTypeDescription || null,
            icon: '👤',
            defaultSlotDuration: 60,
            defaultSlotCapacity: 1,
            allowGroupSessions: false,
            requireApproval: false,
            isActive: true,
            displayOrder: 0,
          },
        })
      }

      return newTenant
    })

    return NextResponse.json(
      {
        message: 'Tenant created successfully',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          bookingUrl: `/${tenant.slug}/book`,
          adminUrl: `/admin/${tenant.slug}`,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            providers: true,
            providerTypes: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tenants })
  } catch (error) {
    console.error('Tenant listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}
