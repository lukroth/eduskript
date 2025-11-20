'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ClassInfo {
  name: string
  description: string | null
  teacherName: string | null
  memberCount: number
}

export default function JoinClassPage() {
  const params = useParams()
  const inviteCode = params.inviteCode as string
  const router = useRouter()
  const { data: session, status } = useSession()

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  const loadClassInfo = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/classes/join/${inviteCode}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('This invite link is invalid or has expired.')
        } else {
          setError('Failed to load class information.')
        }
        return
      }

      const data = await response.json()
      setClassInfo(data.class)
    } catch (err) {
      console.error('Error loading class info:', err)
      setError('Failed to load class information.')
    } finally {
      setLoading(false)
    }
  }, [inviteCode])

  useEffect(() => {
    loadClassInfo()
  }, [loadClassInfo])

  const handleJoinClass = async () => {
    if (!session) {
      // Redirect to student signin with callback to this page
      router.push(`/auth/signin/student?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    try {
      setJoining(true)
      setError('')

      const response = await fetch(`/api/classes/join/${inviteCode}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to join class')
        return
      }

      const data = await response.json()

      if (data.alreadyMember) {
        setAlreadyMember(true)
      } else {
        setSuccess(true)
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error joining class:', err)
      setError('Failed to join class. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !classInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Invalid Invite Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button
              className="w-full mt-4"
              onClick={() => router.push('/')}
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Successfully Joined!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You have successfully joined <span className="font-semibold">{classInfo?.name}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Already a Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You are already a member of <span className="font-semibold">{classInfo?.name}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Join Class</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {classInfo && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold text-lg">{classInfo.name}</h3>
                {classInfo.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {classInfo.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {classInfo.teacherName && (
                  <div>Teacher: {classInfo.teacherName}</div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{classInfo.memberCount} student{classInfo.memberCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!session ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You need to be signed in to join this class.
              </p>
              <Button
                className="w-full"
                onClick={handleJoinClass}
              >
                Sign In to Join
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoinClass}
              disabled={joining}
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join This Class'
              )}
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Your privacy is protected. Only a pseudonymous identifier will be stored.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
