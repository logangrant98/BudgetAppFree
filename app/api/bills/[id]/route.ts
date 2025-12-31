import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update a bill
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
    const existingBill = await prisma.bill.findUnique({
      where: { id }
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (existingBill.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existingBill.name,
        paymentAmount: body.paymentAmount !== undefined ? parseFloat(String(body.paymentAmount)) : existingBill.paymentAmount,
        apr: body.apr !== undefined ? parseFloat(String(body.apr)) : existingBill.apr,
        remainingBalance: body.remainingBalance !== undefined ? parseFloat(String(body.remainingBalance)) : existingBill.remainingBalance,
        dueDate: body.dueDate !== undefined ? body.dueDate : existingBill.dueDate,
        billType: body.billType !== undefined ? body.billType : existingBill.billType,
        allowableLateDay: body.allowableLateDay !== undefined ? parseInt(String(body.allowableLateDay)) : existingBill.allowableLateDay
      }
    })

    return NextResponse.json(updatedBill)
  } catch (error) {
    console.error('Error updating bill:', error)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

// DELETE - Delete a bill
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
    const existingBill = await prisma.bill.findUnique({
      where: { id }
    })

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (existingBill.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.bill.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
