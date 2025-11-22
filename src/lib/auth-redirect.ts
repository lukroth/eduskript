/**
 * Centralized authentication redirect utilities
 *
 * This module provides intelligent sign-in URL generation that automatically
 * determines whether to use teacher or student sign-in based on context.
 */

import { Session } from 'next-auth'

/**
 * Routes that are exclusively for teachers
 */
const TEACHER_ROUTES = [
  '/dashboard',
  '/auth/teacher-signin',
]

/**
 * Determine if a path is a teacher-only route
 */
export function isTeacherRoute(pathname: string): boolean {
  return TEACHER_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Determine the appropriate sign-in type based on context
 *
 * Priority:
 * 1. Session role (if session exists but is expired/invalid)
 * 2. Current pathname (if on teacher route, use teacher signin)
 * 3. Referrer header (if coming from teacher route)
 * 4. Default to student signin
 */
export function getSignInType(options: {
  pathname?: string
  session?: Session | null
  role?: 'teacher' | 'student'
}): 'teacher' | 'student' {
  const { pathname, session, role } = options

  // 1. Explicit role provided
  if (role) {
    return role
  }

  // 2. Check session role (for expired sessions that still have data)
  if (session?.user?.role === 'teacher') {
    return 'teacher'
  }

  // 3. Check current pathname
  if (pathname && isTeacherRoute(pathname)) {
    return 'teacher'
  }

  // 4. Default to student
  return 'student'
}

/**
 * Generate a sign-in URL with the appropriate type and callback
 *
 * @param callbackUrl - URL to redirect to after successful sign-in
 * @param options - Additional context for determining sign-in type
 * @returns Complete sign-in URL with type and callback parameters
 */
export function getSignInUrl(
  callbackUrl: string,
  options: {
    pathname?: string
    session?: Session | null
    role?: 'teacher' | 'student'
  } = {}
): string {
  const type = getSignInType(options)
  const params = new URLSearchParams()

  if (type === 'teacher') {
    params.set('type', 'teacher')
  }

  params.set('callbackUrl', callbackUrl)

  return `/auth/signin?${params.toString()}`
}

/**
 * Client-side sign-in URL generator using window.location
 */
export function getSignInUrlClient(options: {
  session?: Session | null
  role?: 'teacher' | 'student'
} = {}): string {
  if (typeof window === 'undefined') {
    throw new Error('getSignInUrlClient can only be called on the client side')
  }

  return getSignInUrl(window.location.pathname, {
    pathname: window.location.pathname,
    ...options,
  })
}
