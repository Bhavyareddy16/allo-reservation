'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Box, LayoutDashboard, Minus, Plus } from 'lucide-react'

type Stock = {
  stockId: string
  warehouseId: string
  warehouseName: string
  availableStock: number
}

type Product = {
  id: string
  sku: string
  name: string
  description: string
  price: number
  stock: Stock[]
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Track quantities per stockId
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  
  const router = useRouter()

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data)
      
      // Initialize quantities to 1
      const initialQuantities: Record<string, number> = {}
      data.forEach((p: Product) => {
        p.stock.forEach(s => {
          initialQuantities[s.stockId] = 1
        })
      })
      setQuantities(initialQuantities)
      
    } catch (err) {
      console.error(err)
      setError('Could not load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const updateQuantity = (stockId: string, delta: number, max: number) => {
    setQuantities(prev => {
      const current = prev[stockId] || 1
      const next = Math.max(1, Math.min(max, current + delta))
      return { ...prev, [stockId]: next }
    })
  }

  const handleReserve = async (stockId: string) => {
    setReserving(stockId)
    setError(null)
    
    const quantity = quantities[stockId] || 1
    const idempotencyKey = crypto.randomUUID()

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ stockId, quantity })
      })

      const data = await res.json()

      if (res.status === 409) {
        toast.error('Not enough stock available. Another customer may have reserved it first.')
        setError('Not enough stock available. Another customer may have reserved it first.')
        fetchProducts() // refresh stock
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reserve')
      }

      toast.success('Item reserved!')
      router.push(`/checkout/${data.id}`)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setReserving(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading products...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Engineering Demo Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto p-4 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Allo Store</h1>
              <p className="text-sm text-gray-500 font-medium hidden sm:block">Live warehouse inventory with checkout reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/purchases')}>
              My Purchases
            </Button>
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
              <LayoutDashboard className="w-4 h-4" />
              Engineering Demo
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl mt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-white border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-semibold">{product.name}</CardTitle>
                    {product.sku && (
                      <div className="text-xs font-mono text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">
                        SKU: {product.sku}
                      </div>
                    )}
                    <CardDescription className="mt-2 text-sm">{product.description}</CardDescription>
                  </div>
                  <div className="font-bold text-xl text-blue-600">${product.price.toFixed(2)}</div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 bg-gray-50/30 pt-4">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <Box className="w-3 h-3" />
                  Availability by Warehouse
                </h3>
                
                <div className="space-y-3">
                  {product.stock.map((s) => {
                    const isOutOfStock = s.availableStock <= 0
                    const currentQty = quantities[s.stockId] || 1

                    return (
                      <div key={s.stockId} className={`flex flex-col p-4 border rounded-xl bg-white ${isOutOfStock ? 'opacity-70 grayscale' : 'shadow-sm'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">{s.warehouseName}</div>
                            <div className="text-sm mt-0.5">
                              {!isOutOfStock ? (
                                <span className="text-green-600 font-medium flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                  {s.availableStock} in stock
                                </span>
                              ) : (
                                <span className="text-red-500 font-medium">Out of stock</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">Qty:</span>
                            <div className="flex items-center bg-gray-100 rounded-md">
                              <button 
                                onClick={() => updateQuantity(s.stockId, -1, s.availableStock)}
                                disabled={isOutOfStock || currentQty <= 1}
                                className="p-1 hover:bg-gray-200 disabled:opacity-50 rounded-l-md transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {isOutOfStock ? 0 : currentQty}
                              </span>
                              <button 
                                onClick={() => updateQuantity(s.stockId, 1, s.availableStock)}
                                disabled={isOutOfStock || currentQty >= s.availableStock}
                                className="p-1 hover:bg-gray-200 disabled:opacity-50 rounded-r-md transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleReserve(s.stockId)}
                            disabled={isOutOfStock || reserving === s.stockId}
                            size="sm"
                            className={isOutOfStock ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 hover:bg-blue-700'}
                          >
                            {reserving === s.stockId ? 'Reserving...' : isOutOfStock ? 'Out of stock' : 'Reserve'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
