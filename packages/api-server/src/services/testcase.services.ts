import { NotFoundError } from 'http-errors-enhanced'
import { fetchDomainProblem, minio, testcaseUploadCollection } from '@argoncs/common'

import path = require('node:path')
import { nanoid } from 'nanoid'

export async function testcaseExists ({ problemId, domainId, filename, versionId }: { problemId: string, domainId: string, filename: string, versionId: string }): Promise<void> {
  const objectName = path.join(domainId, problemId, filename)
  try {
    const stat = await minio.statObject('testcases', objectName, { versionId })

    if (stat == null || stat.versionId !== versionId) {
      throw new NotFoundError('One of the testcases not found')
    }
  } catch (err) {
    throw new NotFoundError('One of the testcases not found')
  }
}

export async function createUploadSession ({ problemId, domainId }: { problemId: string, domainId: string }): Promise<{ uploadId: string }> {
  const id = nanoid(32)
  await fetchDomainProblem({ problemId, domainId }) // Could throw not found
  await testcaseUploadCollection.insertOne({ id, problemId, domainId, createdAt: (new Date()).getTime() })
  return { uploadId: id }
}
