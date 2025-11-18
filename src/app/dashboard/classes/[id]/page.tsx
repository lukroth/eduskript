'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Users, Mail, Copy, Check, Eye, EyeOff } from 'lucide-react'

interface Student {
  id: string
  displayName: string
  pseudonym: string
  email: string
  joinedAt: string
  lastSeenAt: string | null
}

interface EmailMapping {
  [email: string]: string // email -> pseudonym
}

export default function ClassDetailPage() {
  const params = useParams()
  const classId = params.id as string
  const router = useRouter()
  const { data: session, status } = useSession()

  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [showMapping, setShowMapping] = useState(false)
  const [mappingInput, setMappingInput] = useState('')
  const [emailMapping, setEmailMapping] = useState<EmailMapping>({})
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  // Load email mapping from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`class_email_mapping_${classId}`)
    if (stored) {
      try {
        setEmailMapping(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to parse stored mapping:', error)
      }
    }
  }, [classId])

  // Save email mapping to localStorage whenever it changes
  const saveMapping = (newMapping: EmailMapping) => {
    setEmailMapping(newMapping)
    localStorage.setItem(`class_email_mapping_${classId}`, JSON.stringify(newMapping))
  }

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

    loadClassData()
  }, [session, status, router, classId])

  const loadClassData = async () => {
    try {
      setLoading(true)

      // Load class details
      const classResponse = await fetch(`/api/classes`)
      if (classResponse.ok) {
        const data = await classResponse.json()
        const currentClass = data.classes.find((c: any) => c.id === classId)
        if (currentClass) {
          setClassName(currentClass.name)
          setInviteCode(currentClass.inviteCode)
        }
      }

      // Load students
      const studentsResponse = await fetch(`/api/classes/${classId}/students`)
      if (studentsResponse.ok) {
        const data = await studentsResponse.json()
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error loading class data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkImport = async () => {
    if (!emailInput.trim()) return

    try {
      setImporting(true)

      // Parse emails (split by newlines, commas, or spaces)
      const emails = emailInput
        .split(/[\n,\s]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'))

      if (emails.length === 0) {
        alert('No valid emails found')
        return
      }

      const response = await fetch(`/api/classes/${classId}/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails })
      })

      if (!response.ok) {
        throw new Error('Failed to import emails')
      }

      const data = await response.json()

      // Save the email-to-pseudonym mapping
      const newMapping = { ...emailMapping, ...data.mappings }
      saveMapping(newMapping)

      alert(
        `Successfully imported!\n\n` +
        `- ${data.imported} new pre-authorizations added\n` +
        `- ${data.alreadyMembers} already enrolled\n` +
        `- ${data.alreadyPreAuthorized} already pre-authorized`
      )

      setEmailInput('')
      loadClassData()
    } catch (error) {
      console.error('Error importing emails:', error)
      alert('Failed to import emails. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleViewMapping = () => {
    if (!mappingInput.trim()) {
      setShowMapping(false)
      return
    }

    // Parse emails from input
    const emails = mappingInput
      .split(/[\n,\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'))

    setShowMapping(true)
  }

  const getMappedPseudonyms = () => {
    if (!mappingInput.trim()) return []

    const emails = mappingInput
      .split(/[\n,\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'))

    return emails.map(email => {
      const pseudonymEmail = emailMapping[email]
      if (!pseudonymEmail) {
        return { email, status: 'not-imported', pseudonym: null }
      }

      // Check if student has joined
      const joined = students.find(s => s.email === pseudonymEmail)
      if (joined) {
        return {
          email,
          status: 'joined',
          pseudonym: pseudonymEmail,
          displayName: joined.displayName,
          joinedAt: joined.joinedAt
        }
      }

      return { email, status: 'pending', pseudonym: pseudonymEmail }
    })
  }

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/classes/join/${inviteCode}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading class...</p>
      </div>
    )
  }

  const mappedResults = showMapping ? getMappedPseudonyms() : []

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/classes')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">{className}</h1>
          <p className="text-muted-foreground mt-1">
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>

        {/* Invite Link */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Invite Link</CardTitle>
            <CardDescription>
              Share this link with students to allow them to join the class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-muted px-3 py-2 rounded">
                {typeof window !== 'undefined' && `${window.location.origin}/classes/join/${inviteCode}`}
              </code>
              <Button variant="outline" onClick={copyInviteLink}>
                {copiedInvite ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Import */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Bulk Import Students
            </CardTitle>
            <CardDescription>
              Pre-authorize students by importing their email addresses. When they sign up, they&apos;ll automatically be added to this class.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailInput">Student Emails</Label>
              <Textarea
                id="emailInput"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Paste student email addresses (one per line, or comma-separated)"
                rows={5}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleBulkImport} disabled={importing || !emailInput.trim()}>
              {importing ? 'Importing...' : 'Import Emails'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Note: Email addresses will be hashed and stored securely. They will not be visible to anyone except you (stored locally in your browser).
            </p>
          </CardContent>
        </Card>

        {/* Email Mapping Tool */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Student Lookup
            </CardTitle>
            <CardDescription>
              Paste email addresses to see which students have joined
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mappingInput">Email Addresses to Check</Label>
              <Textarea
                id="mappingInput"
                value={mappingInput}
                onChange={(e) => setMappingInput(e.target.value)}
                placeholder="Paste email addresses to look up"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleViewMapping}
              disabled={!mappingInput.trim()}
              variant="outline"
            >
              {showMapping ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showMapping ? 'Hide Results' : 'Check Status'}
            </Button>

            {showMapping && mappedResults.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Student ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedResults.map((result, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-mono text-xs">{result.email}</td>
                        <td className="p-3">
                          {result.status === 'joined' && (
                            <span className="text-green-600 font-medium">✓ Joined</span>
                          )}
                          {result.status === 'pending' && (
                            <span className="text-yellow-600 font-medium">⏳ Pending</span>
                          )}
                          {result.status === 'not-imported' && (
                            <span className="text-gray-500">Not imported</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {result.status === 'joined' && result.displayName}
                          {result.status === 'pending' && 'Waiting for signup...'}
                          {result.status === 'not-imported' && '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrolled Students */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Enrolled Students ({students.length})
            </CardTitle>
            <CardDescription>
              Students who have joined this class
            </CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No students have joined yet. Share the invite link or import student emails to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{student.displayName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {student.pseudonym}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Joined {new Date(student.joinedAt).toLocaleDateString()}</div>
                      {student.lastSeenAt && (
                        <div className="text-xs">
                          Last seen {new Date(student.lastSeenAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
