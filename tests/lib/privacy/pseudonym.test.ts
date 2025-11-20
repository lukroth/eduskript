import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

describe('Pseudonym generation', () => {
  const MOCK_SECRET = 'test-secret-key-for-pseudonym-generation'

  beforeEach(() => {
    process.env.STUDENT_PSEUDONYM_SECRET = MOCK_SECRET
  })

  const generatePseudonym = (email: string): string => {
    const secret = process.env.STUDENT_PSEUDONYM_SECRET
    if (!secret) {
      throw new Error('STUDENT_PSEUDONYM_SECRET environment variable is not set')
    }

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(email.toLowerCase().trim())
    return hmac.digest('hex').substring(0, 16)
  }

  describe('Pseudonym generation', () => {
    it('should generate consistent pseudonyms for the same email', () => {
      const email = 'student@example.com'
      const pseudonym1 = generatePseudonym(email)
      const pseudonym2 = generatePseudonym(email)

      expect(pseudonym1).toBe(pseudonym2)
      expect(pseudonym1).toHaveLength(16)
    })

    it('should generate different pseudonyms for different emails', () => {
      const email1 = 'student1@example.com'
      const email2 = 'student2@example.com'

      const pseudonym1 = generatePseudonym(email1)
      const pseudonym2 = generatePseudonym(email2)

      expect(pseudonym1).not.toBe(pseudonym2)
    })

    it('should be case-insensitive', () => {
      const pseudonym1 = generatePseudonym('Student@Example.Com')
      const pseudonym2 = generatePseudonym('student@example.com')

      expect(pseudonym1).toBe(pseudonym2)
    })

    it('should trim whitespace', () => {
      const pseudonym1 = generatePseudonym('  student@example.com  ')
      const pseudonym2 = generatePseudonym('student@example.com')

      expect(pseudonym1).toBe(pseudonym2)
    })

    it('should throw error when secret is not set', () => {
      delete process.env.STUDENT_PSEUDONYM_SECRET

      expect(() => generatePseudonym('student@example.com')).toThrow(
        'STUDENT_PSEUDONYM_SECRET environment variable is not set'
      )
    })
  })

  describe('Pseudonym format', () => {
    it('should generate hexadecimal strings', () => {
      const pseudonym = generatePseudonym('student@example.com')
      expect(/^[0-9a-f]{16}$/.test(pseudonym)).toBe(true)
    })

    it('should have consistent length', () => {
      const emails = [
        'short@ex.com',
        'very.long.email.address@example.com',
        'test+tag@domain.co.uk',
      ]

      emails.forEach(email => {
        const pseudonym = generatePseudonym(email)
        expect(pseudonym).toHaveLength(16)
      })
    })
  })

  describe('Student email generation', () => {
    it('should create student email from pseudonym', () => {
      const originalEmail = 'student@example.com'
      const pseudonym = generatePseudonym(originalEmail)
      const studentEmail = `student_${pseudonym}@eduskript.local`

      expect(studentEmail).toContain('student_')
      expect(studentEmail).toContain('@eduskript.local')
      expect(studentEmail).toContain(pseudonym)
    })

    it('should not contain original email in student email', () => {
      const originalEmail = 'student@example.com'
      const pseudonym = generatePseudonym(originalEmail)
      const studentEmail = `student_${pseudonym}@eduskript.local`

      expect(studentEmail).not.toContain('example.com')
      expect(studentEmail).not.toContain('student@')
    })
  })
})
