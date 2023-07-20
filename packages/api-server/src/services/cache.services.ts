import { cacheRedis } from '@argoncs/common'

export async function fetchCache<T> ({ key }: { key: string }): Promise<T | null> {
  try {
    const cache = await cacheRedis.get(key)
    if (cache == null) {
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

export async function refreshCache ({ key, data }: { key: string, data: any }): Promise<void> {
  await cacheRedis.set(key, JSON.stringify(data), 'KEEPTTL')
}
