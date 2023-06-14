import { NotFoundError } from 'http-errors-enhanced'
import { minio, testcaseUploadCollection } from '@argoncs/common'

import path = require('node:path')
import { longNanoId } from '../utils/nanoid.utils.js'

export async function testcaseExists (problemId: string, domainId: string, filename: string, versionId: string): Promise<void> {
  const objectName = path.join(domainId, problemId, filename)
  try {
    const stat = await minio.statObject('testcases', objectName, { versionId })

    if (stat == null || stat.versionId !== versionId) {
      throw new NotFoundError('No test case found with the given identifiers.', { domainId, problemId, filename, versionId })
    }
  } catch (err) {
    throw new NotFoundError('No test case found with the given identifiers.', { domainId, problemId, filename, versionId })
  }
}

export async function createUploadSession (problemId: string, domainId: string): Promise<string> {
  const id = await longNanoId()
  await testcaseUploadCollection.insertOne({ id, problemId, domainId, createdAt: new Date() })
  return id
}
