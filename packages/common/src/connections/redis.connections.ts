import { Redis } from 'ioredis'

export const localRedis = new Redis(process.env.LOCAL_REDIS_URL ?? '')
