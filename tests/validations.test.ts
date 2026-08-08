import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, createTaskSchema, createCommentSchema } from '@/lib/validations'

describe('Validation schemas', () => {
  it('should validate valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject registration with invalid email', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'invalid-email',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('should reject registration with short password', () => {
    const result = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })

  it('should reject registration with empty name', () => {
    const result = registerSchema.safeParse({
      name: '',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('should validate valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject login with invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'invalid',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('should validate valid task creation', () => {
    const result = createTaskSchema.safeParse({
      title: 'Test task',
      description: 'Test description',
      priority: 'HIGH',
    })
    expect(result.success).toBe(true)
  })

  it('should reject task without title', () => {
    const result = createTaskSchema.safeParse({
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('should validate valid comment', () => {
    const result = createCommentSchema.safeParse({
      content: 'This is a comment',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty comment', () => {
    const result = createCommentSchema.safeParse({
      content: '',
    })
    expect(result.success).toBe(false)
  })
})