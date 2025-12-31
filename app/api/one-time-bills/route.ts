import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all one-time bills for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bills = await prisma.oneTimeBill.findMany({
      where: { userId: user.userId },
      orderBy: { paycheckDate: 'asc' }
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('Error fetching one-time bills:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

// POST a new one-time bill
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, amount, paycheckDate, dueDate } = body

    if (!name || !amount || !paycheckDate) {
      return NextResponse.json(
        { error: 'Name, amount, and paycheck date are required' },
        { status: 400 }
      )
    }

    const bill = await prisma.oneTimeBill.create({
      data: {
        userId: user.userId,
        name,
        amount: parseFloat(amount),
        paycheckDate,
        dueDate: dueDate || null,
        isPaid: false
      }
    })

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    console.error('Error creating one-time bill:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
