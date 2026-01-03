import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update a credit card (including balance updates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!existingCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.balance !== undefined) updateData.balance = parseFloat(String(body.balance))
    if (body.minimumPayment !== undefined) updateData.minimumPayment = parseFloat(String(body.minimumPayment))
    if (body.recommendedPayment !== undefined) updateData.recommendedPayment = parseFloat(String(body.recommendedPayment))
    if (body.apr !== undefined) updateData.apr = parseFloat(String(body.apr))
    if (body.dueDate !== undefined) updateData.dueDate = String(body.dueDate)

    const creditCard = await prisma.creditCard.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(creditCard)
  } catch (error) {
    console.error('Error updating credit card:', error)
    return NextResponse.json({ error: 'Failed to update credit card' }, { status: 500 })
  }
}

// DELETE - Remove a credit card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existingCard = await prisma.creditCard.findFirst({
      where: {
        id,
        userId: user.userId
      }
    })

    if (!existingCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 })
    }

    await prisma.creditCard.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting credit card:', error)
    return NextResponse.json({ error: 'Failed to delete credit card' }, { status: 500 })
  }
}
