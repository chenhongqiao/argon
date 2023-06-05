import { Redis } from 'ioredis'

export const cacheRedis = new Redis(process.env.LOCAL_REDIS_URL ?? '')
