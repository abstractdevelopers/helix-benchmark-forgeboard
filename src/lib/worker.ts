import { Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { prisma } from '@/lib/db'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const notificationWorker = new Worker(
  'notifications',
  async (job: Job) => {
    const { userId, message } = job.data
    try {
      await prisma.notification.create({
        data: {
          userId,
          message,
        },
      })
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

notificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`)
})

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err)
})
