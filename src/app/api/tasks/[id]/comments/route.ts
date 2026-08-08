import { NextResponse } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { createCommentSchema } from '@/lib/validations'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await requireProjectAccess(task.projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ comments })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await requireProjectAccess(task.projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: { taskId, userId: authResult.user.id, content: parsed.data.content },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  await prisma.activity.create({
    data: { projectId: task.projectId, taskId, userId: authResult.user.id, action: 'COMMENT_ADDED', details: `Added a comment to "${task.title}"` },
  })

  return NextResponse.json({ comment }, { status: 201 })
}
