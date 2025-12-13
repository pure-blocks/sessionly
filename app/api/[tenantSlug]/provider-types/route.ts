import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/tenant-context'
import { generateUniqueProviderTypeSlug } from '@/lib/slug'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  try {
    const { tenantId } = await getTenantContext()

    const providerTypes = await prisma.providerType.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { providers: true },
        },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ providerTypes })
  } catch (error: any) {
    console.error('Provider types fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider types', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
) {
  try {
    const { tenantId } = await getTenantContext()
    const body = await request.json()

    const {
      name,
      nameSingular,
      description,
      icon,
      defaultSlotDuration,
      defaultSlotCapacity,
      allowGroupSessions,
      requireApproval,
    } = body

    // Validation
    if (!name || !nameSingular) {
      return NextResponse.json(
        { error: 'Name and singular name are required' },
        { status: 400 }
      )
    }

    // Generate unique slug
    const slug = await generateUniqueProviderTypeSlug(name, tenantId)

    const providerType = await prisma.providerType.create({
      data: {
        tenantId,
        name,
        nameSingular,
        slug,
        description: description || null,
        icon: icon || '👤',
        defaultSlotDuration: defaultSlotDuration || 60,
        defaultSlotCapacity: defaultSlotCapacity || 1,
        allowGroupSessions: allowGroupSessions || false,
        requireApproval: requireApproval || false,
        isActive: true,
        displayOrder: 0,
      },
    })

    return NextResponse.json(
      { message: 'Provider type created', providerType },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Provider type creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create provider type', details: error.message },
      { status: 500 }
    )
  }
}
