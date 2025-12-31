import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all bills for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bills = await prisma.bill.findMany({
      where: { userId: user.userId },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

// POST a new bill
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, paymentAmount, apr, remainingBalance, dueDate, billType, allowableLateDay } = body

    if (!name || !dueDate || paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Name, due date, and payment amount are required' },
        { status: 400 }
      )
    }

    // Check for duplicate bill
    const existingBill = await prisma.bill.findFirst({
      where: {
        userId: user.userId,
        name,
        dueDate
      }
    })

    if (existingBill) {
      return NextResponse.json(
        { error: 'A bill with this name and due date already exists' },
        { status: 409 }
      )
    }

    const bill = await prisma.bill.create({
      data: {
        userId: user.userId,
        name,
        paymentAmount: parseFloat(String(paymentAmount)),
        apr: parseFloat(String(apr)) || 0,
        remainingBalance: parseFloat(String(remainingBalance)) || 0,
        dueDate,
        billType: billType || 'recurring',
        allowableLateDay: parseInt(String(allowableLateDay)) || 0
      }
    })

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    console.error('Error creating bill:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
