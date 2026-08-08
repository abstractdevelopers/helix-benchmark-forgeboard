import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const notificationQueue = new Queue('notifications', {
  connection: redis,
})

export const redisConnection = redis
