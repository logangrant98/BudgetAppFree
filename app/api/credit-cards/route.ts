import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all credit cards for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const creditCards = await prisma.creditCard.findMany({
      where: { userId: user.userId },
      orderBy: { name: 'asc' },
      include: {
        payments: {
          orderBy: { paycheckDate: 'asc' }
        }
      }
    })

    return NextResponse.json(creditCards)
  } catch (error) {
    console.error('Error fetching credit cards:', error)
    return NextResponse.json({ error: 'Failed to fetch credit cards' }, { status: 500 })
  }
}

// POST a new credit card
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, balance, minimumPayment, recommendedPayment, apr, dueDate } = body

    if (!name || balance === undefined || !dueDate) {
      return NextResponse.json(
        { error: 'Name, balance, and due date are required' },
        { status: 400 }
      )
    }

    // Check for duplicate credit card
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        userId: user.userId,
        name
      }
    })

    if (existingCard) {
      return NextResponse.json(
        { error: 'A credit card with this name already exists' },
        { status: 409 }
      )
    }

    const creditCard = await prisma.creditCard.create({
      data: {
        userId: user.userId,
        name,
        balance: parseFloat(String(balance)),
        minimumPayment: parseFloat(String(minimumPayment)) || 0,
        recommendedPayment: parseFloat(String(recommendedPayment)) || parseFloat(String(minimumPayment)) || 0,
        apr: parseFloat(String(apr)) || 0,
        dueDate: String(dueDate)
      }
    })

    return NextResponse.json(creditCard, { status: 201 })
  } catch (error) {
    console.error('Error creating credit card:', error)
    return NextResponse.json({ error: 'Failed to create credit card' }, { status: 500 })
  }
}
