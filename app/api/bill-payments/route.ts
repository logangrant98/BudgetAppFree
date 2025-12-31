import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all bill payments for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payments = await prisma.billPayment.findMany({
      where: { userId: user.userId },
      orderBy: { paidAt: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching bill payments:', error)
    return NextResponse.json({ error: 'Failed to fetch bill payments' }, { status: 500 })
  }
}

// POST - Toggle bill payment status (create or delete)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paycheckDate, billName, billDueDate, isPaid } = body

    if (!paycheckDate || !billName || !billDueDate) {
      return NextResponse.json(
        { error: 'Paycheck date, bill name, and bill due date are required' },
        { status: 400 }
      )
    }

    if (isPaid) {
      // Create or update the payment record
      const payment = await prisma.billPayment.upsert({
        where: {
          userId_paycheckDate_billName_billDueDate: {
            userId: user.userId,
            paycheckDate,
            billName,
            billDueDate
          }
        },
        update: {
          isPaid: true,
          paidAt: new Date()
        },
        create: {
          userId: user.userId,
          paycheckDate,
          billName,
          billDueDate,
          isPaid: true,
          paidAt: new Date()
        }
      })
      return NextResponse.json(payment, { status: 200 })
    } else {
      // Delete the payment record if marking as unpaid
      await prisma.billPayment.deleteMany({
        where: {
          userId: user.userId,
          paycheckDate,
          billName,
          billDueDate
        }
      })
      return NextResponse.json({ success: true }, { status: 200 })
    }
  } catch (error) {
    console.error('Error toggling bill payment:', error)
    return NextResponse.json({ error: 'Failed to update bill payment' }, { status: 500 })
  }
}
