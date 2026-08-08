import { NextResponse } from 'next/server'
import { requireAuth, requireProjectOwner } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { inviteMemberSchema } from '@/lib/validations'
import { notificationQueue } from '@/lib/queue'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

  const project = await requireProjectOwner(projectId, authResult.user.id)
  if (!project) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const parsed = inviteMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await prisma.member.findFirst({ where: { projectId, userId: user.id } })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  const member = await prisma.member.create({
    data: { projectId, userId: user.id, role: 'MEMBER' },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  await prisma.activity.create({
    data: { projectId, userId: authResult.user.id, action: 'MEMBER_INVITED', details: `Invited ${user.name || user.email} to the project` },
  })

  await notificationQueue.add('notify', { userId: user.id, message: `${authResult.user.name} invited you to project "${project.name}"` })

  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const userId = searchParams.get('userId')
  if (!projectId || !userId) return NextResponse.json({ error: 'Project and user IDs required' }, { status: 400 })

  const project = await requireProjectOwner(projectId, authResult.user.id)
  if (!project) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  await prisma.member.deleteMany({ where: { projectId, userId } })
  return NextResponse.json({ success: true })
}
