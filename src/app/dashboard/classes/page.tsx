'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Users, Link as LinkIcon, Copy, Check } from 'lucide-react'

interface Class {
  id: string
  name: string
  description: string | null
  inviteCode: string
  memberCount: number
  preAuthorizedCount: number
  createdAt: string
  updatedAt: string
}

export default function ClassesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newClassDescription, setNewClassDescription] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Check if user is a teacher
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user?.accountType !== 'teacher') {
      router.push('/dashboard')
      return
    }

    loadClasses()
  }, [session, status, router])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/classes')

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

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newClassName.trim()) return

    try {
      setCreating(true)

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          description: newClassDescription.trim() || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create class')
      }

      const data = await response.json()

      // Add new class to list
      setClasses([data.class, ...classes])

      // Reset form
      setNewClassName('')
      setNewClassDescription('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating class:', error)
      alert('Failed to create class. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedCode(inviteCode)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <p>Loading classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Classes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your classes and student enrollments
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            New Class
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Class</CardTitle>
              <CardDescription>
                Create a class to organize students and share content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g., Algebra 101"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="classDescription">Description (Optional)</Label>
                  <Textarea
                    id="classDescription"
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                    placeholder="Brief description of the class"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Class'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first class to start organizing students
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{classItem.name}</CardTitle>
                      {classItem.description && (
                        <CardDescription className="mt-1">
                          {classItem.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/classes/${classItem.id}`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{classItem.memberCount} students</span>
                      </div>
                      {classItem.preAuthorizedCount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-600">
                            {classItem.preAuthorizedCount} pre-authorized
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">
                        {window.location.origin}/classes/join/{classItem.inviteCode}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(classItem.inviteCode)}
                      >
                        {copiedCode === classItem.inviteCode ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
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
