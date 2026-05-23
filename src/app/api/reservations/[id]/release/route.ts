import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const reservation = await prisma.reservation.findUnique({
      where: { id }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.status === 'RELEASED') {
      // Idempotency: Already released
      return NextResponse.json(reservation)
    }

    if (reservation.status === 'CONFIRMED') {
      return NextResponse.json({ error: 'Reservation already confirmed' }, { status: 400 })
    }

    // Release reservation
    const [released] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'RELEASED' }
      }),
      prisma.stock.update({
        where: { id: reservation.stockId },
        data: { reservedUnits: { decrement: reservation.quantity } }
      })
    ])

    return NextResponse.json(released)

  } catch (error) {
    console.error('Error releasing reservation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
