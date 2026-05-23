import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addMinutes } from 'date-fns'

const reserveSchema = z.object({
  stockId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = reserveSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    
    const { stockId, quantity } = parsed.data
    const idempotencyKey = req.headers.get('Idempotency-Key')
    
    // Phase 10: Idempotency
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey }
      })
      if (existing) {
        return NextResponse.json(existing)
      }
    }

    try {
      // Phase 6: Postgres transaction + row-level lock
      const reservation = await prisma.$transaction(async (tx) => {
        
        // Lock the row to prevent concurrent modifications
        const stockRows: any[] = await tx.$queryRaw`SELECT * FROM "Stock" WHERE id = ${stockId} FOR UPDATE`
        
        if (!stockRows || stockRows.length === 0) {
          throw new Error('STOCK_NOT_FOUND')
        }
        
        const currentStock = stockRows[0]

        // Phase 7: Lazy expiry cleanup
        const expiredReservations = await tx.reservation.findMany({
          where: {
            stockId,
            status: 'PENDING',
            expiresAt: { lt: new Date() }
          }
        })

        let effectiveReservedUnits = currentStock.reservedUnits

        if (expiredReservations.length > 0) {
          const totalExpiredQuantity = expiredReservations.reduce((sum, r) => sum + r.quantity, 0)
          
          await tx.reservation.updateMany({
            where: { id: { in: expiredReservations.map(r => r.id) } },
            data: { status: 'RELEASED' }
          })
          
          effectiveReservedUnits -= totalExpiredQuantity
          
          // Reconcile stock
          await tx.stock.update({
            where: { id: stockId },
            data: { reservedUnits: effectiveReservedUnits }
          })
        }

        const available = currentStock.totalUnits - effectiveReservedUnits
        if (available < quantity) {
          throw new Error('INSUFFICIENT_STOCK')
        }

        const expiresAt = addMinutes(new Date(), 10)

        // Reserve
        const newReservation = await tx.reservation.create({
          data: {
            stockId,
            quantity,
            expiresAt,
            idempotencyKey,
            status: 'PENDING'
          }
        })

        await tx.stock.update({
          where: { id: stockId },
          data: { reservedUnits: { increment: quantity } }
        })

        return newReservation
      })

      return NextResponse.json(reservation, { status: 201 })

    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_STOCK') {
        return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
      }
      if (err.message === 'STOCK_NOT_FOUND') {
        return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
      }
      throw err
    }

  } catch (error) {
    console.error('Error reserving stock:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
