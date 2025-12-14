import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const trainers = await prisma.trainer.findMany()
    return NextResponse.json(trainers)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trainers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, bio } = body

    const trainer = await prisma.trainer.create({
      data: {
        name,
        email,
        bio,
        rateCard: null  // Add the new field
      }
    })

    return NextResponse.json(trainer, { status: 201 })
  } catch (error) {
    console.error('Trainer creation error:', error)
    return NextResponse.json({ error: 'Failed to create trainer' }, { status: 500 })
  }
}
