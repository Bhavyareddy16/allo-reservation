import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const purchases = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED'
      },
      include: {
        stock: {
          include: {
            product: true,
            warehouse: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
