import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'

async function main() {
  console.log('Seeding database...')

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Smith',
      password: await hash('password123', 12),
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      name: 'Sarah Johnson',
      password: await hash('password123', 12),
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'mike@example.com' },
    update: {},
    create: {
      email: 'mike@example.com',
      name: 'Mike Wilson',
      password: await hash('password123', 12),
    },
  })

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website',
      ownerId: user1.id,
      members: {
        create: [
          { userId: user1.id, role: 'OWNER' },
          { userId: user2.id, role: 'MEMBER' },
          { userId: user3.id, role: 'MEMBER' },
        ],
      },
    },
    include: { members: true },
  })

  const task1 = await prisma.task.create({
    data: {
      title: 'Implement API',
      description: 'Build REST API endpoints',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      projectId: project.id,
      creatorId: user1.id,
      assigneeId: user2.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.task.create({
    data: {
      title: 'Design Homepage',
      description: 'Create mockups for the new homepage',
      status: 'REVIEW',
      priority: 'MEDIUM',
      projectId: project.id,
      creatorId: user2.id,
      assigneeId: user2.id,
    },
  })

  await prisma.task.create({
    data: {
      title: 'Write Tests',
      status: 'TODO',
      priority: 'LOW',
      projectId: project.id,
      creatorId: user3.id,
    },
  })

  await prisma.comment.create({
    data: {
      content: 'I\'ll start working on this today',
      taskId: task1.id,
      userId: user2.id,
    },
  })

  await prisma.activity.createMany({
    data: [
      { projectId: project.id, userId: user1.id, action: 'PROJECT_CREATED', details: `Created project "${project.name}"` },
      { projectId: project.id, taskId: task1.id, userId: user1.id, action: 'TASK_CREATED', details: `Created task "Implement API"` },
      { projectId: project.id, taskId: task1.id, userId: user1.id, action: 'TASK_ASSIGNED', details: `Assigned task "Implement API" to Sarah Johnson` },
      { projectId: project.id, taskId: task1.id, userId: user2.id, action: 'TASK_STATUS_CHANGED', details: `Moved task "Implement API" -> IN PROGRESS` },
    ],
  })

  console.log('Seed data created successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })