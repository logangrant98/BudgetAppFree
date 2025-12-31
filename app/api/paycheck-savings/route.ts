import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all paycheck savings for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const savings = await prisma.paycheckSavings.findMany({
      where: { userId: user.userId },
      orderBy: { paycheckDate: 'asc' }
    })

    return NextResponse.json(savings)
  } catch (error) {
    console.error('Error fetching paycheck savings:', error)
    return NextResponse.json({ error: 'Failed to fetch savings' }, { status: 500 })
  }
}

// POST or update paycheck savings (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paycheckDate, amount, isDeposited } = body

    if (!paycheckDate || amount === undefined) {
      return NextResponse.json(
        { error: 'Paycheck date and amount are required' },
        { status: 400 }
      )
    }

    // Upsert - create or update the savings for this paycheck
    const savings = await prisma.paycheckSavings.upsert({
      where: {
        userId_paycheckDate: {
          userId: user.userId,
          paycheckDate
        }
      },
      update: {
        amount: parseFloat(amount),
        isDeposited: isDeposited ?? false
      },
      create: {
        userId: user.userId,
        paycheckDate,
        amount: parseFloat(amount),
        isDeposited: isDeposited ?? false
      }
    })

    return NextResponse.json(savings, { status: 200 })
  } catch (error) {
    console.error('Error saving paycheck savings:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
