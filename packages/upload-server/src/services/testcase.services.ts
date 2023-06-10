import { minio } from '@argoncs/common'
import { MultipartFile } from '@fastify/multipart'
import path = require('node:path')

export async function uploadTestcase (domainId: string, problemId: string, testcase: MultipartFile): Promise<{ versionId: string, name: string }> {
  const filename = testcase.filename.replaceAll('/', '.')
  const objectName = path.join(domainId, problemId, filename)
  const { versionId } = await minio.putObject('testcases', objectName, testcase.file)
  if (versionId == null) {
    throw Error('Versioning not enabled on testcases bucket.')
  }

  return { versionId, name: filename }
}
