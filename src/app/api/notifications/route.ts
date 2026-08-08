import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/authorization'
import { prisma } from '@/lib/db'

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const notifications = await prisma.notification.findMany({
    where: { userId: authResult.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  await prisma.notification.updateMany({ where: { userId: authResult.user.id }, data: { read: true } })

  return NextResponse.json({ notifications })
}
