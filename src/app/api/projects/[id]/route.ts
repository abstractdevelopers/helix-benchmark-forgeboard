import { NextResponse } from 'next/server'
import { requireAuth, requireProjectOwner, requireProjectAccess } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { updateProjectSchema } from '@/lib/validations'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  const { id } = await params
  const member = await requireProjectAccess(id, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: { include: { creator: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      activities: { include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
    },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ project })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  const { id } = await params
  const body = await request.json()
  const { id: _, ...data } = body
  const project = await requireProjectOwner(id, authResult.user.id)
  if (!project) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const parsed = updateProjectSchema.safeParse(data)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  const updated = await prisma.project.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ project: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  const { id } = await params
  const project = await requireProjectOwner(id, authResult.user.id)
  if (!project) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
