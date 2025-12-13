import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const trainer = await prisma.trainer.findUnique({
      where: { id },
      include: {
        availability: {
          orderBy: { date: 'asc' }
        },
        bookings: {
          include: { availability: true }
        }
      }
    })

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })
    }

    return NextResponse.json(trainer)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainer' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, bio } = body

    const trainer = await prisma.trainer.update({
      where: { id },
      data: { name, email, bio }
    })

    return NextResponse.json(trainer)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update trainer' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.trainer.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Trainer deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete trainer' }, { status: 500 })
  }
}
