import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'
import { generateUniqueProviderSlug } from '@/lib/slug'
import { generateSecurePassword } from '@/lib/password'
import { sendProviderInvitation } from '@/lib/email'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantId } = await getTenantContext()

    const providers = await prisma.provider.findMany({
      where: { tenantId },
      include: {
        providerType: {
          select: {
            id: true,
            name: true,
            icon: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            availability: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ providers })
  } catch (error: unknown) {
    console.error('Providers fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch providers', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await request.json()

    const { name, email, bio, providerTypeId, categoryId, profileImageUrl, defaultHourlyRate } =
      body

    // Validation
    if (!name || !email || !providerTypeId) {
      return NextResponse.json(
        { error: 'Name, email, and provider type are required' },
        { status: 400 }
      )
    }

    // Parse defaultHourlyRate
    const hourlyRate = defaultHourlyRate ? parseFloat(defaultHourlyRate) : null

    // Verify provider type belongs to this tenant
    const providerType = await prisma.providerType.findFirst({
      where: { id: providerTypeId, tenantId },
    })

    if (!providerType) {
      return NextResponse.json(
        { error: 'Invalid provider type' },
        { status: 400 }
      )
    }

    // Check if email already exists for this tenant
    const existingProvider = await prisma.provider.findFirst({
      where: { tenantId, email },
    })

    if (existingProvider) {
      return NextResponse.json(
        { error: 'A provider with this email already exists' },
        { status: 409 }
      )
    }

    // Generate unique slug
    const slug = await generateUniqueProviderSlug(name, tenantId)

    // Generate temporary password for provider login
    const temporaryPassword = generateSecurePassword(12)
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    // Create provider and user account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if user with this email already exists
      let user = await tx.user.findUnique({
        where: { email },
      })

      // Create user account if doesn't exist
      if (!user) {
        user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            tenantId,
            role: 'provider',
          },
        })
      }

      // Create provider
      const provider = await tx.provider.create({
        data: {
          tenantId,
          providerTypeId,
          name,
          email,
          slug,
          bio: bio || null,
          profileImageUrl: profileImageUrl || null,
          categoryId: categoryId || null,
          defaultHourlyRate: hourlyRate,
          isActive: true,
          acceptingBookings: true,
        },
        include: {
          providerType: true,
          category: true,
          tenant: true,
        },
      })

      // Link user to provider if not already linked
      if (!user.providerId) {
        await tx.user.update({
          where: { id: user.id },
          data: { providerId: provider.id },
        })
      }

      return { provider, user }
    })

    const { provider, user } = result

    // Get tenant info for email
    const tenant = provider.tenant || await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    // Send invitation email (async, don't wait for completion)
    if (tenant) {
      const loginUrl = `${process.env.NEXTAUTH_URL}/${tenant.slug}/login`

      sendProviderInvitation({
        providerName: provider.name,
        providerEmail: provider.email,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        loginUrl,
        email: provider.email,
        temporaryPassword,
        providerType: provider.providerType.name,
      }).catch(error => {
        console.error('Failed to send provider invitation email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json(
      {
        message: 'Provider created successfully. Invitation email sent.',
        provider,
        credentials: {
          email: provider.email,
          temporaryPassword, // Return this so admin can also see it
        }
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Provider creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create provider', details: errorMessage },
      { status: 500 }
    )
  }
}
