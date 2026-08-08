'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import Navbar from '@/components/Navbar'

interface Project {
  id: string
  name: string
  description: string | null
  owner: { id: string; name: string | null; email: string }
  members: { id: string; role: string; user: { id: string; name: string | null; email: string } }[]
  tasks: Task[]
  activities: Activity[]
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: string | null
  creator: { id: string; name: string | null }
  assignee: { id: string; name: string | null } | null
}

interface Activity {
  id: string
  action: string
  details: string | null
  user: { id: string; name: string | null }
  task: { id: string; title: string } | null
  createdAt: string
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-50 text-blue-600',
  MEDIUM: 'bg-yellow-50 text-yellow-600',
  HIGH: 'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
}

function ProjectPageClient({ projectId }: { projectId: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'activity'>('tasks')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState('MEDIUM')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchProject()
  }, [projectId])

  async function fetchProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        if (res.status === 403) router.push('/dashboard')
        throw new Error(`Failed to load project (${res.status})`)
      }
      const data = await res.json()
      setProject(data.project)
    } catch (err: any) {
      if (err.message?.includes('403')) return
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle, description: taskDesc, priority: taskPriority, dueDate: taskDueDate || undefined, assigneeId: taskAssignee || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create task')
      }
      setShowCreateTask(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskPriority('MEDIUM')
      setTaskDueDate('')
      setTaskAssignee('')
      fetchProject()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleUpdateTask(taskId: string, updates: Record<string, any>) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update task')
      fetchProject()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
      fetchProject()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite member')
      setShowInvite(false)
      setInviteEmail('')
      fetchProject()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
  if (!project) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Project not found</p></div>

  const isOwner = project.owner.id === session?.user?.id
  const tasksByStatus = {
    TODO: project.tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: project.tasks.filter(t => t.status === 'IN_PROGRESS'),
    REVIEW: project.tasks.filter(t => t.status === 'REVIEW'),
    DONE: project.tasks.filter(t => t.status === 'DONE'),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
            <h1 className="text-2xl font-bold mt-1">{project.name}</h1>
            {project.description && <p className="text-gray-500">{project.description}</p>}
          </div>
          {isOwner && <button onClick={handleDeleteProject} className="btn btn-danger btn-sm">Delete Project</button>}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['tasks', 'members', 'activity'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
          ))}
        </div>

        {activeTab === 'tasks' && (
          <>
            <div className="mb-4">
              <button onClick={() => setShowCreateTask(!showCreateTask)} className="btn btn-primary">+ New Task</button>
            </div>
            {showCreateTask && (
              <div className="card mb-6">
                <form onSubmit={handleCreateTask} className="space-y-3">
                  <input type="text" placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="input" required />
                  <textarea placeholder="Description" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="input" rows={2} />
                  <div className="flex gap-3">
                    <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="input" style={{ width: 'auto' }}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                    <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="input" style={{ width: 'auto' }} />
                    <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="input" style={{ width: 'auto' }}>
                      <option value="">Unassigned</option>
                      {project.members.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary">Create</button>
                    <button type="button" onClick={() => setShowCreateTask(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const).map(status => (
                <div key={status} className="bg-gray-100 rounded-xl p-3">
                  <h3 className="font-semibold text-sm mb-3 capitalize">{status.replace('_', ' ')} ({tasksByStatus[status].length})</h3>
                  <div className="space-y-2">
                    {tasksByStatus[status].map(task => (
                      <div key={task.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <div className="flex gap-1">
                            <select value={task.status} onChange={e => handleUpdateTask(task.id, { status: e.target.value })} className="text-xs border rounded px-1 py-0.5" style={{ minWidth: '80px' }}>
                              <option value="TODO">Todo</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="REVIEW">Review</option>
                              <option value="DONE">Done</option>
                            </select>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                          </div>
                        </div>
                        {task.description && <p className="text-xs text-gray-500 mb-2">{task.description.slice(0, 100)}{task.description.length > 100 ? '...' : ''}</p>}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                          {task.assignee && <span>→ {task.assignee.name || task.assignee.id.slice(0, 8)}</span>}
                          {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        </div>
                        <div className="mt-2 text-xs text-gray-400">By {task.creator.name || task.creator.id.slice(0, 8)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'members' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Team Members</h2>
              {isOwner && <button onClick={() => setShowInvite(true)} className="btn btn-primary btn-sm">+ Invite</button>}
            </div>
            {showInvite && (
              <form onSubmit={handleInvite} className="mb-4 flex gap-2">
                <input type="email" placeholder="Email address" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="input" required />
                <button type="submit" className="btn btn-primary btn-sm">Invite</button>
                <button type="button" onClick={() => { setShowInvite(false); setError('') }} className="btn btn-secondary btn-sm">Cancel</button>
              </form>
            )}
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">Role</th></tr></thead>
              <tbody>
                {project.members.map(m => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2">{m.user.name || '-'}</td>
                    <td className="py-2 text-gray-500">{m.user.email}</td>
                    <td className="py-2"><span className={`badge ${m.role === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>{m.role}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card">
            <h2 className="font-semibold mb-4">Activity Feed</h2>
            {project.activities.length === 0 ? <p className="text-gray-500 text-sm">No activity yet</p> : (
              <div className="space-y-3">
                {project.activities.map(a => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs flex-shrink-0">{a.user.name?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <p><span className="font-medium">{a.user.name || 'User'}</span> {a.details}</p>
                      <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  return <ProjectPageClient projectId={projectId} />
}
