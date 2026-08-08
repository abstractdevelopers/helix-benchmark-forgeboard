import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/authorization'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) return NextResponse.json({ error: authResult.error }, { status: authResult.status })

  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (comment.userId !== authResult.user.id) {
    return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id: commentId } })
  return NextResponse.json({ success: true })
}
