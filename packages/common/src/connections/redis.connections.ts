import { Redis } from 'ioredis'

let cacheRedis: Redis
let ranklistRedis: Redis

export async function connectCacheRedis (url: string): Promise<void> {
  cacheRedis = new Redis(url)
}

export function closeCacheRedis (): void {
  cacheRedis.disconnect()
}

export async function connectRanklistRedis (url: string): Promise<void> {
  ranklistRedis = new Redis(url)
}

export function closeRanklistRedis (): void {
  ranklistRedis.disconnect()
}

export { cacheRedis, ranklistRedis }
