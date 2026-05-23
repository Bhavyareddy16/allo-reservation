import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stock: {
          include: {
            warehouse: true,
          },
        },
      },
    })

    const response = products.map((product) => {
      const stockInfo = product.stock.map((s) => ({
        stockId: s.id,
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        availableStock: s.totalUnits - s.reservedUnits,
      }))

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: stockInfo,
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
