import { NotFoundError } from 'http-errors-enhanced'
import { fetchDomainProblem, minio, testcaseUploadCollection } from '@argoncs/common'

import path = require('node:path')
import { longNanoId } from '../utils/nanoid.utils.js'

export async function testcaseExists (problemId: string, domainId: string, filename: string, versionId: string): Promise<void> {
  const objectName = path.join(domainId, problemId, filename)
  try {
    const stat = await minio.statObject('testcases', objectName, { versionId })

    if (stat == null || stat.versionId !== versionId) {
      throw new NotFoundError('One of the testcases not found', { domainId, problemId, filename, versionId })
    }
  } catch (err) {
    throw new NotFoundError('One of the testcases not found', { domainId, problemId, filename, versionId })
  }
}

export async function createUploadSession (problemId: string, domainId: string): Promise<{ uploadId: string }> {
  const id = await longNanoId()
  await fetchDomainProblem(problemId, domainId) // Could throw not found
  await testcaseUploadCollection.insertOne({ id, problemId, domainId, createdAt: (new Date()).getTime() })
  return { uploadId: id }
}
