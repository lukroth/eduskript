import { describe, it, expect } from 'vitest'

describe('Password validation', () => {
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  describe('Length validation', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Short1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should accept passwords with 8 or more characters', () => {
      const result = validatePassword('Valid123')
      expect(result.valid).toBe(true)
    })
  })

  describe('Character type validation', () => {
    it('should require at least one uppercase letter', () => {
      const result = validatePassword('lowercase123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should require at least one lowercase letter', () => {
      const result = validatePassword('UPPERCASE123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should require at least one number', () => {
      const result = validatePassword('NoNumbers')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should accept passwords with all required character types', () => {
      const result = validatePassword('ValidPass123')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Multiple validation errors', () => {
    it('should return all applicable errors', () => {
      const result = validatePassword('weak')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })
})
