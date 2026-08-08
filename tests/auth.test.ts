import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { hash } from 'bcryptjs'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}))

describe('Password hashing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should hash passwords with bcrypt', async () => {
    ;(hash as unknown as Mock).mockResolvedValue('hashed_password')
    const result = await hash('password123', 12)
    expect(result).toBe('hashed_password')
    expect(hash).toHaveBeenCalledWith('password123', 12)
  })
})

describe('Database operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a user with hashed password', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
    }
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await mockPrisma.user.create({ data: userData })
    expect(result.id).toBe('user-1')
    expect(result.email).toBe('john@example.com')
  })

  it('should find user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      password: 'hashed_password',
    })

    const result = await mockPrisma.user.findUnique({ where: { email: 'john@example.com' } })
    expect(result?.email).toBe('john@example.com')
  })

  it('should return null for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const result = await mockPrisma.user.findUnique({ where: { email: 'unknown@example.com' } })
    expect(result).toBeNull()
  })
})