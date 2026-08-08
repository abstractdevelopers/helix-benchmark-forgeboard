import { NextResponse } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { createTaskSchema } from '@/lib/validations'
import { notificationQueue } from '@/lib/queue'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

  const member = await requireProjectAccess(projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const status = searchParams.get('status')
  const tasks = await prisma.task.findMany({
    where: { projectId, ...(status ? { status: status as any } : {}) },
    include: { creator: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

  const member = await requireProjectAccess(projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      projectId,
      creatorId: authResult.user.id,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
    include: { creator: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
  })

  await prisma.activity.create({
    data: { projectId, taskId: task.id, userId: authResult.user.id, action: 'TASK_CREATED', details: `Created task "${task.title}"` },
  })

  if (task.assigneeId && task.assigneeId !== authResult.user.id) {
    await notificationQueue.add('notify', { userId: task.assigneeId, message: `${authResult.user.name} assigned you task "${task.title}"` })
  }

  return NextResponse.json({ task }, { status: 201 })
}
