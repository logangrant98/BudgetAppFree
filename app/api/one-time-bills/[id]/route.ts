import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update a one-time bill (e.g., mark as paid)
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

    // Verify the bill belongs to the user
    const existingBill = await prisma.oneTimeBill.findFirst({
      where: { id, userId: user.userId }
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const updatedBill = await prisma.oneTimeBill.update({
      where: { id },
      data: {
        name: body.name ?? existingBill.name,
        amount: body.amount !== undefined ? parseFloat(body.amount) : existingBill.amount,
        paycheckDate: body.paycheckDate ?? existingBill.paycheckDate,
        dueDate: body.dueDate !== undefined ? body.dueDate : existingBill.dueDate,
        isPaid: body.isPaid !== undefined ? body.isPaid : existingBill.isPaid
      }
    })

    return NextResponse.json(updatedBill)
  } catch (error) {
    console.error('Error updating one-time bill:', error)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

// DELETE - Remove a one-time bill
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

    // Verify the bill belongs to the user
    const existingBill = await prisma.oneTimeBill.findFirst({
      where: { id, userId: user.userId }
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    await prisma.oneTimeBill.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting one-time bill:', error)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
