import { Redis } from 'ioredis'

let cacheRedis: Redis

export async function connectCacheRedis (url: string): Promise<void> {
  cacheRedis = new Redis(url)
}

let ranklistRedis: Redis

export async function connectRanklistRedis (url: string): Promise<void> {
  ranklistRedis = new Redis(url)
}

export { cacheRedis, ranklistRedis }
