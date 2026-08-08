'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-lg px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">ForgeBoard</h1>
        <p className="text-xl text-gray-600 mb-8">Collaborative project management made simple. Create projects, manage tasks, and work together seamlessly.</p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="btn btn-primary px-8 py-3 text-lg">Get Started</a>
          <a href="/register" className="btn btn-secondary px-8 py-3 text-lg">Create Account</a>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div className="card">
            <div className="text-2xl mb-2">📋</div>
            <h3 className="font-semibold">Task Management</h3>
            <p className="text-sm text-gray-500">Organize work efficiently</p>
          </div>
          <div className="card">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold">Team Collaboration</h3>
            <p className="text-sm text-gray-500">Work together in real-time</p>
          </div>
          <div className="card">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold">Activity Tracking</h3>
            <p className="text-sm text-gray-500">Stay in the loop</p>
          </div>
        </div>
      </div>
    </div>
  )
}
