'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Project {
  id: string
  name: string
  description: string | null
  owner: { id: string; name: string | null }
  members: { id: string; role: string; user: { id: string; name: string | null; email: string } }[]
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') fetchProjects()
  }, [status])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`)
      const data = await res.json()
      setProjects(data.projects)
    } catch (err: any) {
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create project')
      }
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      fetchProjects()
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">+ New Project</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {showCreate && (
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">Create Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" rows={2} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">No projects yet. Create your first project to get started!</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">Create Project</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <span className="badge bg-blue-100 text-blue-800">{p.members.length} members</span>
                </div>
                {p.description && <p className="text-sm text-gray-500 mb-3">{p.description}</p>}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Owner: {p.owner.name || 'Unknown'}</span>
                  <a href={`/project/${p.id}`} className="text-blue-600 hover:underline">View →</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}