import { NotFoundError } from '@argoncs/types'
import { minio } from '@argoncs/libraries'

import path = require('node:path')

export async function testcaseExists (problemId: string, domainId: string, filename: string, versionId: string): Promise<void> {
  const objectName = path.join(domainId, problemId, filename)
  const stat = await minio.statObject('testcases', objectName, { versionId })

  if (stat == null || stat.versionId !== versionId) {
    throw new NotFoundError('Testcase does not exist.', { domainId, problemId, filename, versionId })
  }
}
