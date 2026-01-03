import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all credit card payments for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payments = await prisma.creditCardPayment.findMany({
      where: { userId: user.userId },
      orderBy: { paycheckDate: 'asc' },
      include: {
        creditCard: true
      }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching credit card payments:', error)
    return NextResponse.json({ error: 'Failed to fetch credit card payments' }, { status: 500 })
  }
}

// POST - Create or update a credit card payment
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { creditCardId, paycheckDate, amount, isPaid, extraPayment } = body

    if (!creditCardId || !paycheckDate) {
      return NextResponse.json(
        { error: 'Credit card ID and paycheck date are required' },
        { status: 400 }
      )
    }

    // Verify credit card ownership
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.userId
      }
    })

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })
    }

    // Calculate the payment amount (recommended payment + any extra)
    const paymentAmount = parseFloat(String(amount)) || creditCard.recommendedPayment
    const totalPayment = paymentAmount + (parseFloat(String(extraPayment)) || 0)

    // Calculate new balance after payment
    const newBalance = isPaid ? Math.max(0, creditCard.balance - totalPayment) : null

    // Upsert the payment record
    const payment = await prisma.creditCardPayment.upsert({
      where: {
        creditCardId_paycheckDate: {
          creditCardId,
          paycheckDate
        }
      },
      update: {
        amount: totalPayment,
        isPaid: isPaid || false,
        newBalance,
        paidAt: isPaid ? new Date() : null
      },
      create: {
        creditCardId,
        userId: user.userId,
        paycheckDate,
        amount: totalPayment,
        isPaid: isPaid || false,
        newBalance,
        paidAt: isPaid ? new Date() : null
      }
    })

    // If payment is marked as paid, update the credit card balance
    if (isPaid && newBalance !== null) {
      await prisma.creditCard.update({
        where: { id: creditCardId },
        data: { balance: newBalance }
      })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error creating/updating credit card payment:', error)
    return NextResponse.json({ error: 'Failed to save credit card payment' }, { status: 500 })
  }
}

// DELETE - Remove a credit card payment (unpay)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const creditCardId = searchParams.get('creditCardId')
    const paycheckDate = searchParams.get('paycheckDate')

    if (!creditCardId || !paycheckDate) {
      return NextResponse.json(
        { error: 'Credit card ID and paycheck date are required' },
        { status: 400 }
      )
    }

    // Verify ownership through credit card
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId: user.userId
      }
    })

    if (!creditCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })
    }

    // Get the payment before deleting to restore balance
    const payment = await prisma.creditCardPayment.findUnique({
      where: {
        creditCardId_paycheckDate: {
          creditCardId,
          paycheckDate
        }
      }
    })

    if (payment && payment.isPaid) {
      // Restore the balance by adding back the payment amount
      await prisma.creditCard.update({
        where: { id: creditCardId },
        data: { balance: creditCard.balance + payment.amount }
      })
    }

    await prisma.creditCardPayment.delete({
      where: {
        creditCardId_paycheckDate: {
          creditCardId,
          paycheckDate
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credit card payment:', error)
    return NextResponse.json({ error: 'Failed to delete credit card payment' }, { status: 500 })
  }
}
