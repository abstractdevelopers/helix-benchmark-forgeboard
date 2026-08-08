import { describe, it, expect, vi, beforeEach } from 'vitest'

// Valid UUIDs for test data
const USER_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const USER_C_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const TASK_ID = '11111111-1111-1111-1111-111111111111'
const PROJECT_ID = '22222222-2222-2222-2222-222222222222'

// Mock functions at module level so vi.mock factories can reference them
const mockRequireAuth = vi.fn()
const mockRequireProjectAccess = vi.fn()
const mockTaskFindUnique = vi.fn()
const mockTaskUpdate = vi.fn()
const mockActivityCreate = vi.fn()
const mockNotificationAdd = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    task: {
      findUnique: mockTaskFindUnique,
      update: mockTaskUpdate,
    },
    activity: {
      create: mockActivityCreate,
    },
  },
}))

vi.mock('@/lib/authorization', () => ({
  requireAuth: mockRequireAuth,
  requireProjectAccess: mockRequireProjectAccess,
}))

vi.mock('@/lib/queue', () => ({
  notificationQueue: {
    add: mockNotificationAdd,
  },
}))

describe('Task assignment race condition', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mocks for each test
    mockRequireAuth.mockResolvedValue({
      user: { id: USER_A_ID, name: 'User A' },
    })
    mockRequireProjectAccess.mockResolvedValue({
      id: 'member-1',
      userId: USER_A_ID,
      role: 'MEMBER',
    })

    mockActivityCreate.mockResolvedValue({ id: 'activity-1' })
  })

  it('should apply concurrent assignee updates without losing the last write', async () => {
    const { prisma } = await import('@/lib/db')
    const routeModule = await import('@/app/api/tasks/[id]/route')

    // Both requests read the same initial task state (assigned to User A)
    const initialTask = {
      id: TASK_ID,
      title: 'Important task',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
      projectId: PROJECT_ID,
      creatorId: USER_A_ID,
      assigneeId: USER_A_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: PROJECT_ID },
    }
    mockTaskFindUnique.mockResolvedValue(initialTask)

    // First update: assign to User B
    const taskAfterFirstUpdate = {
      ...initialTask,
      assigneeId: USER_B_ID,
      assignee: { id: USER_B_ID, name: 'User B' },
      creator: { id: USER_A_ID, name: 'User A' },
    }
    mockTaskUpdate.mockResolvedValueOnce(taskAfterFirstUpdate)

    // Second update: assign to User C (concurrent, after first update already ran)
    const taskAfterSecondUpdate = {
      ...initialTask,
      assigneeId: USER_C_ID,
      assignee: { id: USER_C_ID, name: 'User C' },
      creator: { id: USER_A_ID, name: 'User A' },
    }
    mockTaskUpdate.mockResolvedValueOnce(taskAfterSecondUpdate)

    // Simulate two concurrent PATCH requests
    const request1 = new Request('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId: USER_B_ID }),
    })
    const request2 = new Request('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId: USER_C_ID }),
    })

    const params = { then: (cb: any) => cb({ id: TASK_ID }) } as any

    const [res1, res2] = await Promise.all([
      routeModule.PATCH(request1, { params }),
      routeModule.PATCH(request2, { params }),
    ])

    const body1 = await res1.json()
    const body2 = await res2.json()

    // Both requests should succeed (no silent failures from stale assignee check)
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)

    // The update should have been called (not updateMany with stale assignee filter)
    expect(prisma.task.update).toHaveBeenCalledTimes(2)

    // Verify the updates were applied correctly
    expect(body1.task.assigneeId).toBe(USER_B_ID)
    expect(body2.task.assigneeId).toBe(USER_C_ID)
  })

  it('should not use updateMany with stale assigneeId filter', async () => {
    const { prisma } = await import('@/lib/db')
    const routeModule = await import('@/app/api/tasks/[id]/route')

    const initialTask = {
      id: TASK_ID,
      title: 'Test task',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
      projectId: PROJECT_ID,
      creatorId: USER_A_ID,
      assigneeId: USER_A_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: PROJECT_ID },
    }
    mockTaskFindUnique.mockResolvedValue(initialTask)

    const updatedTask = {
      ...initialTask,
      title: 'Updated title',
      assigneeId: USER_B_ID,
      assignee: { id: USER_B_ID, name: 'User B' },
      creator: { id: USER_A_ID, name: 'User A' },
    }
    mockTaskUpdate.mockResolvedValue(updatedTask)

    const request = new Request('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title', assigneeId: USER_B_ID }),
    })
    const params = { then: (cb: any) => cb({ id: TASK_ID }) } as any

    const res = await routeModule.PATCH(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(prisma.task.update).toHaveBeenCalledTimes(1)

    // Verify the where clause only uses id (not assigneeId)
    const updateCall = (mockTaskUpdate as any).mock.calls[0]
    expect(updateCall[0].where).toEqual({ id: TASK_ID })
    expect(updateCall[0].where.assigneeId).toBeUndefined()

    expect(body.task.title).toBe('Updated title')
    expect(body.task.assigneeId).toBe(USER_B_ID)
  })

  it('should handle unassigning a task (empty assigneeId)', async () => {
    const { prisma } = await import('@/lib/db')
    const routeModule = await import('@/app/api/tasks/[id]/route')

    const initialTask = {
      id: TASK_ID,
      title: 'Test task',
      description: null,
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: null,
      projectId: PROJECT_ID,
      creatorId: USER_A_ID,
      assigneeId: USER_B_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: PROJECT_ID },
    }
    mockTaskFindUnique.mockResolvedValue(initialTask)

    const updatedTask = {
      ...initialTask,
      assigneeId: null,
      assignee: null,
      creator: { id: USER_A_ID, name: 'User A' },
    }
    mockTaskUpdate.mockResolvedValue(updatedTask)

    const request = new Request('http://localhost/api/tasks/task-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId: '' }),
    })
    const params = { then: (cb: any) => cb({ id: TASK_ID }) } as any

    const res = await routeModule.PATCH(request, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(prisma.task.update).toHaveBeenCalledTimes(1)
    expect(body.task.assigneeId).toBeNull()
  })
})