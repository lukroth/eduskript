/**
 * Teacher Exam Toolbar Component
 *
 * A collapsible control bar for teachers to manage exam state per class.
 * Shows at the top of the page when viewing their own exam as a teacher.
 *
 * Features:
 * - Expandable drawer with detailed student list
 * - Class selector (from unlocked classes)
 * - Three-state control: Closed → Lobby → Open (any transition allowed)
 * - Live student counts and individual status
 * - Reopen action for submitted students
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Circle,
  RotateCcw,
  DoorOpen,
  Lock,
  Unlock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTeacherClass } from '@/contexts/teacher-class-context'
import { cn } from '@/lib/utils'

interface ExamClass {
  id: string
  name: string
}

interface StudentStatus {
  id: string
  name: string | null
  email: string | null
  studentPseudonym: string | null
  status: 'not_started' | 'taking' | 'submitted'
  startedAt?: string
  submittedAt?: string
}

interface StudentCounts {
  total: number
  notStarted: number
  taking: number
  submitted: number
}

interface TeacherExamToolbarProps {
  pageId: string
  unlockedClasses: ExamClass[]
}

type ExamState = 'closed' | 'lobby' | 'open' | null

const POLL_INTERVAL_MS = 10000 // Poll student counts every 10 seconds

export function TeacherExamToolbar({
  pageId,
  unlockedClasses
}: TeacherExamToolbarProps) {
  const { selectedClass, setSelectedClass } = useTeacherClass()
  const [examState, setExamState] = useState<ExamState>(null)
  const [studentCounts, setStudentCounts] = useState<StudentCounts | null>(null)
  const [students, setStudents] = useState<StudentStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [reopeningStudent, setReopeningStudent] = useState<string | null>(null)

  // Auto-select first class if none selected and classes available
  useEffect(() => {
    if (!selectedClass && unlockedClasses.length > 0) {
      setSelectedClass({
        id: unlockedClasses[0].id,
        name: unlockedClasses[0].name
      })
    }
  }, [selectedClass, unlockedClasses, setSelectedClass])

  // Fetch exam state and student counts
  const fetchExamData = useCallback(async () => {
    if (!selectedClass) return

    setIsLoading(true)
    try {
      // Fetch exam state
      const stateResponse = await fetch(
        `/api/exams/${pageId}/state?classId=${selectedClass.id}`
      )
      if (stateResponse.ok) {
        const stateData = await stateResponse.json()
        setExamState(stateData.state || 'closed')
      }

      // Fetch student data (includes counts and individual status)
      const studentsResponse = await fetch(
        `/api/exams/${pageId}/students?classId=${selectedClass.id}`
      )
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        setStudentCounts(studentsData.counts)
        setStudents(studentsData.students || [])
      }
    } catch (error) {
      console.error('Error fetching exam data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [pageId, selectedClass])

  // Initial fetch and polling
  useEffect(() => {
    fetchExamData()

    // Poll for updates
    const interval = setInterval(fetchExamData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchExamData])

  // Set exam state directly
  const setExamStateTo = async (newState: 'closed' | 'lobby' | 'open') => {
    if (!selectedClass) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/exams/${pageId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass.id,
          state: newState
        })
      })

      if (response.ok) {
        const data = await response.json()
        setExamState(data.state)
        // Refresh student counts after state change
        fetchExamData()
      }
    } catch (error) {
      console.error('Error updating exam state:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Reopen exam for a specific student
  const reopenForStudent = async (studentId: string) => {
    if (!selectedClass) return

    setReopeningStudent(studentId)
    try {
      const response = await fetch(`/api/exams/${pageId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          classId: selectedClass.id,
          action: 'reopen'
        })
      })

      if (response.ok) {
        // Refresh student list
        fetchExamData()
      } else {
        const data = await response.json()
        console.error('Error reopening exam:', data.error)
      }
    } catch (error) {
      console.error('Error reopening exam for student:', error)
    } finally {
      setReopeningStudent(null)
    }
  }

  // No classes unlocked for this exam
  if (unlockedClasses.length === 0) {
    return (
      <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
        <p className="text-sm text-muted-foreground text-center">
          No classes have been unlocked for this exam yet.
        </p>
      </div>
    )
  }

  const getStateConfig = () => {
    switch (examState) {
      case 'open':
        return { color: 'bg-green-500', label: 'Open' }
      case 'lobby':
        return { color: 'bg-yellow-500', label: 'Lobby' }
      default:
        return { color: 'bg-red-500', label: 'Closed' }
    }
  }

  const stateConfig = getStateConfig()

  const getStatusIcon = (status: StudentStatus['status']) => {
    switch (status) {
      case 'taking':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'submitted':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusLabel = (status: StudentStatus['status']) => {
    switch (status) {
      case 'taking':
        return 'Taking exam'
      case 'submitted':
        return 'Submitted'
      default:
        return 'Not started'
    }
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Get display name for student (prefer name, fallback to pseudonym)
  const getStudentDisplayName = (student: StudentStatus) => {
    if (student.name) return student.name
    if (student.studentPseudonym) return `Student ${student.studentPseudonym.slice(0, 8)}`
    return 'Unknown student'
  }

  return (
    <div className="bg-card border border-border rounded-lg mb-4 shadow-sm overflow-hidden">
      {/* Main toolbar bar */}
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Class:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {selectedClass?.name || 'Select class'}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {unlockedClasses.map((cls) => (
                  <DropdownMenuItem
                    key={cls.id}
                    onClick={() => setSelectedClass({ id: cls.id, name: cls.name })}
                  >
                    {cls.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* State Dropdown - combined indicator and controls */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating || !selectedClass}
                className={cn(
                  'gap-2 min-w-[120px]',
                  examState === 'closed' && 'border-red-500/50',
                  examState === 'lobby' && 'border-yellow-500/50',
                  examState === 'open' && 'border-green-500/50'
                )}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      stateConfig.color
                    )} />
                    <span>{stateConfig.label}</span>
                  </>
                )}
                <ChevronDown className="w-4 h-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setExamStateTo('closed')}
                disabled={examState === 'closed'}
                className="gap-2"
              >
                <Lock className="w-4 h-4 text-red-500" />
                <div>
                  <div className="font-medium">Closed</div>
                  <div className="text-xs text-muted-foreground">Students cannot enter</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setExamStateTo('lobby')}
                disabled={examState === 'lobby'}
                className="gap-2"
              >
                <DoorOpen className="w-4 h-4 text-yellow-500" />
                <div>
                  <div className="font-medium">Lobby</div>
                  <div className="text-xs text-muted-foreground">Students wait for you to open</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setExamStateTo('open')}
                disabled={examState === 'open'}
                className="gap-2"
              >
                <Unlock className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-medium">Open</div>
                  <div className="text-xs text-muted-foreground">Students can take the exam</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Student Counts (clickable to expand) */}
          {studentCounts && selectedClass && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-4 text-sm hover:bg-muted/50 rounded-md px-2 py-1 -mr-2 transition-colors"
            >
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{studentCounts.total}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                <Clock className="w-4 h-4" />
                <span>{studentCounts.taking}</span>
              </div>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>{studentCounts.submitted}</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable student list */}
      {isExpanded && selectedClass && (
        <div className="border-t border-border">
          <div className="max-h-64 overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No students in this class yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {getStudentDisplayName(student)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        <span className="truncate max-w-[200px] block">
                          {student.email || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(student.status)}
                          <span className={
                            student.status === 'taking' ? 'text-yellow-600 dark:text-yellow-500' :
                            student.status === 'submitted' ? 'text-green-600 dark:text-green-500' :
                            'text-muted-foreground'
                          }>
                            {getStatusLabel(student.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {student.status === 'taking' && formatTime(student.startedAt) && (
                          <span>Started {formatTime(student.startedAt)}</span>
                        )}
                        {student.status === 'submitted' && formatTime(student.submittedAt) && (
                          <span>At {formatTime(student.submittedAt)}</span>
                        )}
                        {student.status === 'not_started' && '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {student.status === 'submitted' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reopenForStudent(student.id)}
                            disabled={reopeningStudent === student.id}
                            className="h-7 px-2 text-xs gap-1"
                            title="Allow student to retake exam"
                          >
                            {reopeningStudent === student.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Reopen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
