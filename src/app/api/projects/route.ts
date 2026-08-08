import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { createProjectSchema } from '@/lib/validations'
import { NextRequest } from 'next/server'

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: authResult.user.id } } },
    include: { owner: { select: { id: true, name: true, email: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const body = await request.json()
  const parsed = createProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      ownerId: authResult.user.id,
      members: { create: { userId: authResult.user.id, role: 'OWNER' } },
    },
    include: { owner: { select: { id: true, name: true } }, members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  })

  await prisma.activity.create({
    data: { projectId: project.id, userId: authResult.user.id, action: 'PROJECT_CREATED', details: `Created project "${project.name}"` },
  })

  return NextResponse.json({ project }, { status: 201 })
}
