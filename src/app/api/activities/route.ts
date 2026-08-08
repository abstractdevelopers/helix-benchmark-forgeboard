import { NextResponse } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

  const member = await requireProjectAccess(projectId, authResult.user.id)
  if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const activities = await prisma.activity.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ activities })
}
