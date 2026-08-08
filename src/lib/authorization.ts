import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }
  return { user: session.user }
}

export async function requireProjectAccess(projectId: string, userId: string) {
  const { prisma } = await import('@/lib/db')
  const member = await prisma.member.findFirst({
    where: {
      projectId,
      userId,
    },
  })
  return member
}

export async function requireProjectOwner(projectId: string, userId: string) {
  const { prisma } = await import('@/lib/db')
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })
  if (!project || project.ownerId !== userId) {
    return null
  }
  return project
}
