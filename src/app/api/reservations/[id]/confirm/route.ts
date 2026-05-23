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

    if (reservation.status === 'CONFIRMED') {
      // Idempotency: Already confirmed
      return NextResponse.json(reservation)
    }

    if (reservation.status === 'RELEASED') {
      return NextResponse.json({ error: 'Reservation already released' }, { status: 400 })
    }

    if (new Date() > reservation.expiresAt) {
      // Lazy cleanup: It expired. We should release it.
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data: { status: 'RELEASED' }
        }),
        prisma.stock.update({
          where: { id: reservation.stockId },
          data: { reservedUnits: { decrement: reservation.quantity } }
        })
      ])
      return NextResponse.json({ error: 'Reservation expired' }, { status: 410 })
    }

    // Confirm reservation
    // This permanently decrements both totalUnits and reservedUnits
    const [confirmed] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: 'CONFIRMED' }
      }),
      prisma.stock.update({
        where: { id: reservation.stockId },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity }
        }
      })
    ])

    return NextResponse.json(confirmed)

  } catch (error) {
    console.error('Error confirming reservation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
