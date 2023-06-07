import { Redis } from 'ioredis'

let cacheRedis: Redis

export async function connectCacheRedis (url: string): Promise<void> {
  cacheRedis = new Redis(url)
}

export { cacheRedis }
