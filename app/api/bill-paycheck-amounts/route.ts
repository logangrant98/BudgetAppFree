import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all bill paycheck amount overrides for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const amounts = await prisma.billPaycheckAmount.findMany({
      where: { userId: user.userId },
      orderBy: { paycheckDate: 'asc' }
    })

    return NextResponse.json(amounts)
  } catch (error) {
    console.error('Error fetching bill paycheck amounts:', error)
    return NextResponse.json({ error: 'Failed to fetch amounts' }, { status: 500 })
  }
}

// POST or update bill paycheck amount (upsert)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { billName, billDueDate, paycheckDate, amount } = body

    if (!billName || !billDueDate || !paycheckDate || amount === undefined) {
      return NextResponse.json(
        { error: 'Bill name, bill due date, paycheck date, and amount are required' },
        { status: 400 }
      )
    }

    // Upsert - create or update the amount for this specific bill instance and paycheck
    const billAmount = await prisma.billPaycheckAmount.upsert({
      where: {
        userId_billName_billDueDate_paycheckDate: {
          userId: user.userId,
          billName,
          billDueDate,
          paycheckDate
        }
      },
      update: {
        amount: parseFloat(amount)
      },
      create: {
        userId: user.userId,
        billName,
        billDueDate,
        paycheckDate,
        amount: parseFloat(amount)
      }
    })

    return NextResponse.json(billAmount, { status: 200 })
  } catch (error) {
    console.error('Error saving bill paycheck amount:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// DELETE a bill paycheck amount override (revert to default)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const billName = searchParams.get('billName')
    const billDueDate = searchParams.get('billDueDate')
    const paycheckDate = searchParams.get('paycheckDate')

    if (!billName || !billDueDate || !paycheckDate) {
      return NextResponse.json(
        { error: 'Bill name, bill due date, and paycheck date are required' },
        { status: 400 }
      )
    }

    await prisma.billPaycheckAmount.delete({
      where: {
        userId_billName_billDueDate_paycheckDate: {
          userId: user.userId,
          billName,
          billDueDate,
          paycheckDate
        }
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting bill paycheck amount:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
