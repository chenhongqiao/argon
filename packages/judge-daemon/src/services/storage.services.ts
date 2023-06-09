import fs from 'node:fs/promises'
import { emptyDir } from 'fs-extra/esm'
import { LRUCache } from 'lru-cache'
import path from 'node:path'
import { minio } from '@argoncs/common'

let cache: LRUCache<string, string>
let cacheDir: string

export async function prepareStorage (dir: string): Promise<void> {
  cacheDir = dir
  await fs.access(dir)
  await emptyDir(dir)
  const { bsize, bavail } = await fs.statfs(dir)
  const availableSpace = Math.floor(bsize * bavail * 0.9)
  cache = new LRUCache({
    maxSize: availableSpace,
    dispose: (value, key): void => {
      void fs.rm(value)
    }
  })
}

export async function fetchTestcase (objectName: string, versionId: string): Promise<string> {
  const key = path.join('testcases', objectName, versionId)
  const cachedPath = cache.get(key)
  if (cachedPath != null) {
    return cachedPath
  }
  const newPath = path.join(cacheDir, 'testcases', objectName, versionId)
  const size = (await minio.statObject('testcases', objectName, { versionId })).size
  cache.set(key, newPath, { size })
  await minio.fGetObject('testcases', objectName, newPath, { versionId })
  return newPath
}

export async function fetchBinary (objectName: string): Promise<string> {
  const key = path.join('binaries', objectName)
  const cachedPath = cache.get(key)
  if (cachedPath != null) {
    return cachedPath
  }
  const newPath = path.join(cacheDir, 'binaries', objectName)
  const size = (await minio.statObject('binaries', objectName)).size
  cache.set(key, newPath, { size })
  await minio.fGetObject('binaries', objectName, newPath)
  return newPath
}
