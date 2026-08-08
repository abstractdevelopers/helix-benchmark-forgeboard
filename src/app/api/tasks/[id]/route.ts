import { NextResponse } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { updateTaskSchema } from '@/lib/validations'
import { notificationQueue } from '@/lib/queue'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { id: taskId } = await params
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await requireProjectAccess(task.projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const updateData: any = { ...parsed.data }
  if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate)
  if (updateData.assigneeId === '') delete updateData.assigneeId

  const oldStatus = task.status
  const oldAssignee = task.assigneeId

  // FIX: Use prisma.task.update (match on ID only) instead of updateMany with
  // a stale assigneeId check.  The previous code did:
  //   updateMany({ where: { id: taskId, assigneeId: oldAssignee }, ... })
  // which silently dropped concurrent re-assignments (count === 0) and returned
  // stale task data.  Authorization is already verified above so the ID-only
  // where clause is safe.
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: { creator: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
  })

  const activities: any[] = []
  if (oldStatus !== updated?.status) {
    activities.push({ projectId: task.projectId, taskId, userId: authResult.user.id, action: 'TASK_STATUS_CHANGED', details: `Moved task "${updated?.title}" -> ${updated?.status.replace('_', ' ')}` })
  }
  if (oldAssignee !== updated?.assigneeId) {
    const assigneeName = updated?.assignee?.name || 'unassigned'
    activities.push({ projectId: task.projectId, taskId, userId: authResult.user.id, action: 'TASK_ASSIGNED', details: `Assigned task "${updated?.title}" to ${assigneeName}` })
    if (updated?.assigneeId && updated.assigneeId !== authResult.user.id) {
      await notificationQueue.add('notify', { userId: updated.assigneeId, message: `${authResult.user.name} assigned you task "${updated.title}"` })
    }
  }
  for (const a of activities) await prisma.activity.create({ data: a })

  return NextResponse.json({ task: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { id: taskId } = await params
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const member = await requireProjectAccess(task.projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  await prisma.task.delete({ where: { id: taskId } })
  return NextResponse.json({ success: true })
}
