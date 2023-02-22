import { Redis } from 'ioredis'

export const sessionRedis = new Redis(new URL('/0', process.env.REDIS_URL ?? '').href)
