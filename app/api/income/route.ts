import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET all income sources and settings for the current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [sources, settings] = await Promise.all([
      prisma.incomeSource.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.incomeSettings.findUnique({
        where: { userId: user.userId }
      })
    ])

    return NextResponse.json({
      sources,
      settings: settings || { miscPercent: 30, monthsToShow: 1 }
    })
  } catch (error) {
    console.error('Error fetching income:', error)
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 })
  }
}

// POST - Save all income sources and settings (replaces existing)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sources, miscPercent, monthsToShow } = body

    // Delete all existing income sources for this user
    await prisma.incomeSource.deleteMany({
      where: { userId: user.userId }
    })

    // Create new income sources
    if (sources && sources.length > 0) {
      await prisma.incomeSource.createMany({
        data: sources.map((source: {
          id?: string;
          name: string;
          amount: number;
          frequency: string;
          lastPayDate: string;
          firstPayDay?: number;
          secondPayDay?: number;
        }) => ({
          userId: user.userId,
          name: source.name,
          amount: parseFloat(String(source.amount)) || 0,
          frequency: source.frequency,
          lastPayDate: source.lastPayDate || '',
          firstPayDay: source.firstPayDay || null,
          secondPayDay: source.secondPayDay || null
        }))
      })
    }

    // Upsert income settings
    await prisma.incomeSettings.upsert({
      where: { userId: user.userId },
      update: {
        miscPercent: parseFloat(String(miscPercent)) || 30,
        monthsToShow: parseInt(String(monthsToShow)) || 1
      },
      create: {
        userId: user.userId,
        miscPercent: parseFloat(String(miscPercent)) || 30,
        monthsToShow: parseInt(String(monthsToShow)) || 1
      }
    })

    // Fetch and return the updated data
    const [updatedSources, updatedSettings] = await Promise.all([
      prisma.incomeSource.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.incomeSettings.findUnique({
        where: { userId: user.userId }
      })
    ])

    return NextResponse.json({
      sources: updatedSources,
      settings: updatedSettings
    }, { status: 201 })
  } catch (error) {
    console.error('Error saving income:', error)
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500 })
  }
}
