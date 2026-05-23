import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database with 12 items...')

  // Create Warehouses
  const whNY = await prisma.warehouse.create({ data: { name: 'Central Warehouse (NY)' } })
  const whCA = await prisma.warehouse.create({ data: { name: 'West Coast Warehouse (CA)' } })
  const whTX = await prisma.warehouse.create({ data: { name: 'Southern Hub (TX)' } })

  // Create Products
  const productsData = [
    { name: 'Allo Minimalist Watch', sku: 'WATCH-001', description: 'A sleek, minimalist timepiece.', price: 150.00 },
    { name: 'Allo Leather Bag', sku: 'BAG-001', description: 'Premium handcrafted leather bag.', price: 250.00 },
    { name: 'Allo Smart Sunglasses', sku: 'SUN-001', description: 'Polarized lenses with built-in audio.', price: 199.00 },
    { name: 'Allo Wireless Earbuds', sku: 'EAR-002', description: 'Noise cancelling, 24hr battery life.', price: 129.00 },
    { name: 'Allo Ceramic Mug', sku: 'MUG-005', description: 'Handmade ceramic coffee mug.', price: 24.00 },
    { name: 'Allo Mechanical Keyboard', sku: 'KEY-003', description: 'Tactile switches with RGB backlight.', price: 175.00 },
    { name: 'Allo Desk Mat', sku: 'MAT-001', description: 'Premium leather desk protector.', price: 45.00 },
    { name: 'Allo Aluminum Laptop Stand', sku: 'STAND-004', description: 'Ergonomic cooling stand.', price: 65.00 },
    { name: 'Allo Daily Planner', sku: 'PLAN-001', description: 'Undated productivity planner.', price: 28.00 },
    { name: 'Allo Insulated Water Bottle', sku: 'BOT-002', description: 'Keeps drinks cold for 24 hours.', price: 35.00 },
    { name: 'Allo Monitor Light Bar', sku: 'LGT-001', description: 'Reduces eye strain, adjustable temp.', price: 89.00 },
    { name: 'Allo Ergonomic Mouse', sku: 'MOU-001', description: 'Vertical mouse for wrist comfort.', price: 55.00 }
  ]

  const createdProducts = []
  for (const p of productsData) {
    const created = await prisma.product.create({ data: p })
    createdProducts.push(created)
  }

  // Create Stock dynamically
  const stockData = []
  
  // Assign random stock to warehouses
  for (const p of createdProducts) {
    // Randomly assign stock to 1 to 3 warehouses
    const warehousesToAssign = [whNY, whCA, whTX].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1)
    
    for (const wh of warehousesToAssign) {
      stockData.push({
        warehouseId: wh.id,
        productId: p.id,
        totalUnits: Math.floor(Math.random() * 30) + 1, // Random stock between 1 and 30
        reservedUnits: 0
      })
    }
  }

  await prisma.stock.createMany({ data: stockData })

  console.log('Database seeded successfully with expanded inventory.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
