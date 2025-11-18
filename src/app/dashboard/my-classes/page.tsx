'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen } from 'lucide-react'

interface StudentClass {
  id: string
  name: string
  description: string | null
  teacherName: string | null
  memberCount: number
  joinedAt: string
}

export default function MyClassesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user?.accountType !== 'student') {
      router.push('/dashboard')
      return
    }

    loadClasses()
  }, [session, status, router])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/classes/my-classes')

      if (!response.ok) {
        throw new Error('Failed to load classes')
      }

      const data = await response.json()
      setClasses(data.classes)
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <p>Loading your classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground mt-1">
            Classes you&apos;re enrolled in
          </p>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
              <p className="text-muted-foreground text-center">
                You haven&apos;t joined any classes. Ask your teacher for an invite link to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle>{classItem.name}</CardTitle>
                  {classItem.description && (
                    <CardDescription>{classItem.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {classItem.teacherName && (
                      <div>Teacher: {classItem.teacherName}</div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{classItem.memberCount} student{classItem.memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      Joined {new Date(classItem.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
