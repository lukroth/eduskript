/**
 * Privacy-preserving adapter wrapper for NextAuth
 * Intercepts user creation to hash student emails before storing in database
 */

import type { Adapter, AdapterUser } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { generatePseudonym } from './privacy/pseudonym'

interface PrivacyAdapterOptions {
  prisma: PrismaClient
  /**
   * Function to determine if a user should be treated as a student
   * based on the signup context (e.g., domain, OAuth state)
   */
  isStudentSignup?: (email: string, context?: any) => boolean | Promise<boolean>
}

/**
 * Creates a privacy-preserving adapter that wraps PrismaAdapter
 * and hashes student emails before storing them in the database
 */
export function PrivacyAdapter(options: PrivacyAdapterOptions): Adapter {
  const { prisma, isStudentSignup = () => false } = options
  const baseAdapter = PrismaAdapter(prisma) as Adapter

  return {
    ...baseAdapter,
    async createUser(user: Omit<AdapterUser, 'id'>) {
      // Check if this is a student signup
      const isStudent = await isStudentSignup(user.email, user)

      console.log('[PrivacyAdapter] Creating user:', {
        email: user.email,
        isStudent,
      })

      if (isStudent && user.email) {
        // Generate pseudonym from real email
        const pseudonym = generatePseudonym(user.email)

        // Create a hashed email that won't conflict with real emails
        const hashedEmail = `student_${pseudonym}@eduskript.local`

        // Store anonymized display name
        const anonymousName = `Student ${pseudonym.substring(0, 4)}`

        // Create user with hashed data
        const createdUser = await prisma.user.create({
          data: {
            email: hashedEmail,
            emailVerified: user.emailVerified,
            name: anonymousName,
            image: null, // Don't store student profile images
            accountType: 'student',
            studentPseudonym: pseudonym,
            gdprConsentAt: null, // Will be set after consent flow
            lastSeenAt: new Date(),
          },
        })

        // Auto-enroll in pre-authorized classes
        // Check if this student's pseudonym was pre-authorized in any classes
        const preAuthorizations = await prisma.preAuthorizedStudent.findMany({
          where: {
            pseudonym: pseudonym
          },
          select: {
            classId: true
          }
        })

        if (preAuthorizations.length > 0) {
          console.log('[PrivacyAdapter] Auto-enrolling student in', preAuthorizations.length, 'class(es)')

          // Create memberships for all pre-authorized classes
          await prisma.classMembership.createMany({
            data: preAuthorizations.map(pa => ({
              classId: pa.classId,
              studentId: createdUser.id
            }))
          })

          // Remove pre-authorizations (they've been consumed)
          await prisma.preAuthorizedStudent.deleteMany({
            where: {
              pseudonym: pseudonym
            }
          })

          console.log('[PrivacyAdapter] Student auto-enrolled and pre-auths cleaned up')
        }

        return {
          id: createdUser.id,
          email: createdUser.email,
          emailVerified: createdUser.emailVerified,
          name: createdUser.name,
          image: createdUser.image,
        }
      }

      // For teachers, use the base adapter (stores real email)
      if (baseAdapter.createUser) {
        const createdUser = await baseAdapter.createUser(user as AdapterUser & Omit<AdapterUser, 'id'>)

        // Set account type to teacher
        await prisma.user.update({
          where: { id: createdUser.id },
          data: {
            accountType: 'teacher',
            lastSeenAt: new Date(),
          },
        })

        return createdUser
      }

      throw new Error('createUser not implemented in base adapter')
    },
  }
}

/**
 * Helper to extract domain context from OAuth callback
 * This will be set in the OAuth state parameter
 */
export function isStudentFromCallback(email: string, request?: any): boolean {
  // Check if the callback contains student indicator
  // This will be set when initiating OAuth from a subdomain
  if (request?.query?.student === 'true') {
    return true
  }

  // Check if the callback URL indicates a subdomain signup
  if (request?.url) {
    const url = new URL(request.url, 'http://dummy.com')
    const domain = url.searchParams.get('domain')
    return domain === 'subdomain'
  }

  return false
}
