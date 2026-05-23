'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Box, ArrowLeft, PackageCheck } from 'lucide-react'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const res = await fetch('/api/purchases')
        const data = await res.json()
        setPurchases(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPurchases()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto p-4 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <Box className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Allo Store</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-3xl mt-8">
        <div className="flex items-center gap-3 mb-8">
          <PackageCheck className="w-8 h-8 text-green-600" />
          <h2 className="text-3xl font-bold tracking-tight">My Purchases</h2>
        </div>

        {loading ? (
          <div className="text-center p-12 text-gray-500">Loading purchases...</div>
        ) : purchases.length === 0 ? (
          <Card className="text-center p-12 border-dashed">
            <div className="text-gray-500 mb-4">You haven't made any purchases yet.</div>
            <Button onClick={() => router.push('/')}>Browse Store</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <Card key={purchase.id} className="overflow-hidden">
                <CardHeader className="bg-white border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-semibold">
                        {purchase.stock.product.name}
                      </CardTitle>
                      <div className="text-xs font-mono text-gray-500 mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">
                        SKU: {purchase.stock.product.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-green-600">
                        ${(purchase.stock.product.price * purchase.quantity).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(purchase.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-gray-50/50 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="font-medium">{purchase.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Fulfilled from:</span>
                    <span className="font-medium">{purchase.stock.warehouse.name}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Order ID:</span>
                    <span className="font-mono text-xs">{purchase.id}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
