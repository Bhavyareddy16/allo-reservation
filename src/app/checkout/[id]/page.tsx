'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  
  const [reservation, setReservation] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [status, setStatus] = useState<'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const res = await fetch(`/api/reservations/${id}`)
        if (!res.ok) throw new Error('Reservation not found')
        const data = await res.json()
        setReservation(data)
        setStatus(data.status)
        
        if (data.status === 'PENDING') {
          const expiresAt = new Date(data.expiresAt).getTime()
          const now = new Date().getTime()
          if (expiresAt > now) {
            setTimeLeft(Math.floor((expiresAt - now) / 1000))
          } else {
            setStatus('EXPIRED')
            setTimeLeft(0)
          }
        }
      } catch (err) {
        toast.error('Could not load reservation details')
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [id])

  useEffect(() => {
    if (status === 'PENDING' && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            clearInterval(timer)
            setStatus('EXPIRED')
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeLeft, status])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
      const data = await res.json()
      
      if (res.status === 410) {
        setStatus('EXPIRED')
        toast.error('Reservation has expired.')
        return
      }
      
      if (!res.ok) throw new Error(data.error || 'Failed to confirm')
      
      setStatus('CONFIRMED')
      toast.success('Purchase confirmed successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      
      setStatus('RELEASED')
      toast.info('Reservation cancelled.')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading checkout details...</div>
  }

  if (!reservation) {
    return <div className="p-8 text-center text-red-500">Reservation not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 mb-8">
        <div className="container mx-auto p-4 max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <h1 className="text-xl font-bold tracking-tight text-blue-600">Allo Store</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/purchases')}>
            My Purchases
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-lg flex flex-col items-center justify-center">
        <Card className="w-full shadow-lg border-gray-200/60">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Checkout</CardTitle>
            <CardDescription>Complete your reservation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <div className="font-semibold text-xl">{reservation.stock.product.name}</div>
              <div className="text-gray-500 text-sm mt-2 flex justify-between">
                <span>Quantity:</span>
                <span className="font-medium text-gray-900">{reservation.quantity}</span>
              </div>
              <div className="text-gray-500 text-sm mt-1 flex justify-between">
                <span>Fulfilling from:</span>
                <span className="font-medium text-gray-900">{reservation.stock.warehouse.name}</span>
              </div>
              <div className="border-t my-3"></div>
              <div className="font-bold text-xl flex justify-between">
                <span>Total:</span>
                <span className="text-blue-600">${(reservation.stock.product.price * reservation.quantity).toFixed(2)}</span>
              </div>
            </div>

            {status === 'PENDING' && timeLeft !== null && (
              <div className="flex items-center justify-center p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl shadow-sm">
                <Clock className="w-5 h-5 mr-2 animate-pulse" />
                <span className="font-medium text-lg">
                  Expires in {formatTime(timeLeft)}
                </span>
              </div>
            )}

            {status === 'EXPIRED' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Expired</AlertTitle>
                <AlertDescription>
                  This reservation has expired and the item has been released back to stock.
                </AlertDescription>
              </Alert>
            )}

            {status === 'CONFIRMED' && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 font-bold">Success!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your order has been confirmed successfully. You can track it in My Purchases.
                </AlertDescription>
              </Alert>
            )}

            {status === 'RELEASED' && (
              <Alert>
                <XCircle className="h-4 w-4 text-gray-500" />
                <AlertTitle>Cancelled</AlertTitle>
                <AlertDescription>
                  You have cancelled this reservation.
                </AlertDescription>
              </Alert>
            )}

          </CardContent>
          <CardFooter className="flex flex-col gap-3 pb-6">
            {status === 'PENDING' ? (
              <>
                <Button 
                  className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md transition-all hover:scale-[1.02]" 
                  onClick={handleConfirm}
                  disabled={actionLoading || timeLeft === 0}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  CONFIRM PURCHASE
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-red-600" 
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  Cancel Order
                </Button>
              </>
            ) : (
              <Button 
                className="w-full h-12" 
                onClick={() => router.push('/')}
              >
                Return to Store
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
