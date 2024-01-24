import { cacheRedis } from '@argoncs/common'
import { backOff } from 'exponential-backoff'
import { ServiceUnavailableError } from 'http-errors-enhanced'
import { json } from 'typia'

export async function fetchCacheUntilLockAcquired<T> ({ key }: { key: string }): Promise<T | null> {
  let cache = await fetchCache<T>({ key })
  if (cache != null) {
    return cache
  }

  let cnt = 0
  while (!(await acquireLock({ key }))) {
    try {
      cache = await backOff(async () => {
        const data = await fetchCache<T>({ key })
        if (data === null) {
          throw new Error('Cache not ready')
        }
        return data
      }, { delayFirstAttempt: true, jitter: 'full' })
    } catch (err) {
      cnt += 1
      if (cnt >= 3) {
        throw new ServiceUnavailableError('Cache locked')
      }
    }
    if (cache != null) {
      return cache
    }
  }

  // Lock acquired
  return null
}

export async function fetchCache<T> ({ key }: { key: string }): Promise<T | null> {
  try {
    const cache = await cacheRedis.getex(key, 'EX', 1600 + Math.floor(Math.random() * 400))
    if (cache == null || cache === '') {
      return null
    }
    return json.assertParse(cache)
  } catch (err) {
    // TODO: Alert cache failure
    return null
  }
}

export async function setCache<T> ({ key, data }: { key: string, data: T }): Promise<boolean> {
  try {
    // Add a random jitter to prevent avalanche
    const status = await cacheRedis.setex(key, 1600 + Math.floor(Math.random() * 400), json.assertStringify<T>(data))
    return Boolean(status)
  } catch (err) {
    return false
  }
}

export async function deleteCache ({ key }: { key: string }): Promise<void> {
  await cacheRedis.del(key)
}

export async function acquireLock ({ key }: { key: string }): Promise<boolean> {
  const status = await cacheRedis.setnx(`${key}:lock`, 1)
  if (status !== 1) {
    return false
  }
  await cacheRedis.expire(`${key}:lock`, 10, 'NX')
  return true
}

export async function releaseLock ({ key }: { key: string }): Promise<void> {
  await cacheRedis.del(`${key}:lock`)
}

export const USER_CACHE_KEY = 'user'
export const USER_PATH_CACHE_KEY = 'user-path'
export const CONTEST_CACHE_KEY = 'contest'
export const CONTEST_PATH_CACHE_KEY = 'contest-path'
export const PROBLEMLIST_CACHE_KEY = 'problem-list'
export const SESSION_CACHE_KEY = 'session'
