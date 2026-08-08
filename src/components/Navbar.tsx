'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === 'loading') return null

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">ForgeBoard</Link>
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard" className={`text-sm font-medium ${pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>Dashboard</Link>
              <span className="text-sm text-gray-600">{session.user?.name || session.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="btn btn-secondary btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
