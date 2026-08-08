import { NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await signOut({ redirect: false })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
