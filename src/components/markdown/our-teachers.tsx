'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Teacher {
  id: string
  name: string | null
  pageSlug: string | null
  pageName: string | null
  image: string | null
  title: string | null
}

interface OurTeachersProps {
  orgSlug?: string
  roles?: ('owner' | 'admin' | 'member')[]
  limit?: number
  className?: string
}

/**
 * OurTeachers component - displays organization member teachers.
 * Usage in markdown:
 *   <OurTeachers />
 *   <OurTeachers roles={['owner', 'admin']} limit={6} />
 */
export function OurTeachers({
  orgSlug,
  roles = ['owner', 'admin'],
  limit = 20,
  className = '',
}: OurTeachersProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgSlug) {
      setError('Organization context not available')
      setLoading(false)
      return
    }

    const fetchTeachers = async () => {
      try {
        const rolesParam = roles.join(',')
        const response = await fetch(
          `/api/organizations/by-slug/${orgSlug}/teachers?roles=${rolesParam}&limit=${limit}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch teachers')
        }

        const data = await response.json()
        setTeachers(data.teachers || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTeachers()
  }, [orgSlug, roles, limit])

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-card border rounded-lg animate-pulse"
          >
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-muted-foreground text-sm p-4 border rounded-lg bg-muted/50">
        {error}
      </div>
    )
  }

  if (teachers.length === 0) {
    return null
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {teachers.map((teacher) => (
        <Link
          key={teacher.id}
          href={teacher.pageSlug ? `/${teacher.pageSlug}` : '#'}
          className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
        >
          {teacher.image ? (
            <Image
              src={teacher.image}
              alt={teacher.name || 'Teacher'}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
              {(teacher.name || 'T').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium">{teacher.pageName || teacher.name || 'Teacher'}</div>
            {teacher.title && (
              <div className="text-sm text-muted-foreground">{teacher.title}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
