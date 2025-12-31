import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update paycheck savings (amount or deposited status)
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

    // Verify the savings entry belongs to the user
    const existingSavings = await prisma.paycheckSavings.findFirst({
      where: { id, userId: user.userId }
    })

    if (!existingSavings) {
      return NextResponse.json({ error: 'Savings entry not found' }, { status: 404 })
    }

    const updatedSavings = await prisma.paycheckSavings.update({
      where: { id },
      data: {
        amount: body.amount !== undefined ? parseFloat(body.amount) : existingSavings.amount,
        isDeposited: body.isDeposited !== undefined ? body.isDeposited : existingSavings.isDeposited
      }
    })

    return NextResponse.json(updatedSavings)
  } catch (error) {
    console.error('Error updating paycheck savings:', error)
    return NextResponse.json({ error: 'Failed to update savings' }, { status: 500 })
  }
}

// DELETE - Remove a paycheck savings override (revert to default)
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

    // Verify the savings entry belongs to the user
    const existingSavings = await prisma.paycheckSavings.findFirst({
      where: { id, userId: user.userId }
    })

    if (!existingSavings) {
      return NextResponse.json({ error: 'Savings entry not found' }, { status: 404 })
    }

    await prisma.paycheckSavings.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting paycheck savings:', error)
    return NextResponse.json({ error: 'Failed to delete savings' }, { status: 500 })
  }
}
