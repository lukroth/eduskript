'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Check, X, Clock, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface IdentityRevealRequest {
  id: string
  email: string
  requestedAt: string
  teacher: {
    name: string | null
    email: string
  }
  class: {
    name: string
    description: string | null
  }
}

export default function PrivacyRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [requests, setRequests] = useState<IdentityRevealRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState('')
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (session?.user?.accountType !== 'student') {
      router.push('/dashboard')
      return
    }

    loadRequests()
  }, [session, status, router])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/identity-reveal-requests')

      if (!response.ok) {
        throw new Error('Failed to load requests')
      }

      const data = await response.json()
      setRequests(data.requests)
    } catch (error) {
      console.error('Error loading requests:', error)
      setDialogType('error')
      setDialogMessage('Failed to load privacy requests. Please try again.')
      setDialogOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (requestId: string, approved: boolean) => {
    try {
      setResponding(requestId)

      const response = await fetch(`/api/identity-reveal-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to respond')
      }

      setDialogType('success')
      setDialogMessage(
        approved
          ? 'Identity revealed successfully. The teacher can now see your email address for this class.'
          : 'Request declined. Your identity remains private.'
      )
      setDialogOpen(true)

      // Remove the request from the list
      setRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (error) {
      console.error('Error responding to request:', error)
      setDialogType('error')
      setDialogMessage(error instanceof Error ? error.message : 'Failed to respond to request. Please try again.')
      setDialogOpen(true)
    } finally {
      setResponding(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Privacy Requests</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="w-8 h-8" />
          Privacy Requests
        </h1>
        <p className="text-muted-foreground mt-2">
          Teachers who want to identify you in their class must ask for your permission first
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-2">
                You&apos;ll be notified here when a teacher wants to identify you in their class
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      Identity Reveal Request
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Requested{' '}
                      {new Date(request.requestedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div>
                    <span className="text-sm font-medium">Teacher:</span>{' '}
                    <span className="text-sm">{request.teacher.name || request.teacher.email}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Class:</span>{' '}
                    <span className="text-sm">{request.class.name}</span>
                    {request.class.description && (
                      <p className="text-xs text-muted-foreground mt-1">{request.class.description}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email they provided:</span>{' '}
                    <span className="text-sm font-mono">{request.email}</span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm">
                    <strong>What this means:</strong> This teacher has added your email address to their class roster
                    and wants to identify you. If you approve, they will be able to see your real email address instead
                    of your anonymous nickname.
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Your choice:</strong> You can approve this request if you trust this teacher and want them
                    to know who you are in their class, or decline to keep your identity private.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleRespond(request.id, false)}
                    disabled={responding === request.id}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </Button>
                  <Button
                    onClick={() => handleRespond(request.id, true)}
                    disabled={responding === request.id}
                    className="flex items-center gap-2"
                  >
                    {responding === request.id ? (
                      'Processing...'
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Approve & Reveal Identity
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogType === 'success' ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  Success
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600" />
                  Error
                </>
              )}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line">{dialogMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
