import { cacheRedis } from '@argoncs/common'

export async function fetchCache<T> ({ key }: { key: string }): Promise<T | null> {
  try {
    const cache = await cacheRedis.get(key)
    if (cache == null || cache === '') {
      return null
    }
    // Renew TTL
    await cacheRedis.expire(key, 3600, 'XX')
    return JSON.parse(cache) as T
  } catch (err) {
    // TODO: Alert cache failure
    return null
  }
}

export async function setCache ({ key, data }: { key: string, data: any }): Promise<boolean> {
  try {
    const status = await cacheRedis.setnx(key, JSON.stringify(data))
    await cacheRedis.expire(key, 3600, 'NX')
    return Boolean(status)
  } catch (err) {
    return false
  }
}

export async function deleteCache ({ key }: { key: string }): Promise<void> {
  await cacheRedis.set(key, '', 'KEEPTTL', 'XX')
}

export const USER_CACHE_KEY = 'user'
export const USER_PATH_CACHE_KEY = 'user-path'
export const CONTEST_CACHE_KEY = 'contest'
export const CONTEST_PATH_CACHE_KEY = 'contest-path'
export const PROBLEMLIST_CACHE_KEY = 'problem-list'
export const SESSION_CACHE_KEY = 'session'
