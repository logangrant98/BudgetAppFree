import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all paycheck amount overrides for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const overrides = await prisma.paycheckAmountOverride.findMany({
      where: { userId: user.userId },
      orderBy: { paycheckDate: 'asc' }
    })

    return NextResponse.json(overrides)
  } catch (error) {
    console.error('Error fetching paycheck amount overrides:', error)
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 })
  }
}

// POST or update paycheck amount override (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sourceId, paycheckDate, amount } = body

    if (!sourceId || !paycheckDate || amount === undefined) {
      return NextResponse.json(
        { error: 'Source ID, paycheck date, and amount are required' },
        { status: 400 }
      )
    }

    // Upsert - create or update the override for this paycheck
    const override = await prisma.paycheckAmountOverride.upsert({
      where: {
        userId_sourceId_paycheckDate: {
          userId: user.userId,
          sourceId,
          paycheckDate
        }
      },
      update: {
        amount: parseFloat(amount)
      },
      create: {
        userId: user.userId,
        sourceId,
        paycheckDate,
        amount: parseFloat(amount)
      }
    })

    return NextResponse.json(override, { status: 200 })
  } catch (error) {
    console.error('Error saving paycheck amount override:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// DELETE a paycheck amount override (reset to default)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const paycheckDate = searchParams.get('paycheckDate')

    if (!sourceId || !paycheckDate) {
      return NextResponse.json(
        { error: 'Source ID and paycheck date are required' },
        { status: 400 }
      )
    }

    await prisma.paycheckAmountOverride.delete({
      where: {
        userId_sourceId_paycheckDate: {
          userId: user.userId,
          sourceId,
          paycheckDate
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting paycheck amount override:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
