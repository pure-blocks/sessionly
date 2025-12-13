import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Update user's tenant association and make them admin
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tenantId,
        role: 'admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
      },
    })

    return NextResponse.json(
      { message: 'User updated successfully', user },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Update tenant error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}
