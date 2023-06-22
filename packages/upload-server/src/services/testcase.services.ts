import { minio, testcaseUploadCollection } from '@argoncs/common'
import { MultipartFile } from '@fastify/multipart'
import { UnauthorizedError } from 'http-errors-enhanced'
import path = require('node:path')

export async function uploadTestcase (domainId: string, problemId: string, testcase: MultipartFile): Promise<{ versionId: string, name: string }> {
  const filename = testcase.filename.replaceAll('/', '.')
  const objectName = path.join(domainId, problemId, filename)
  const { versionId } = await minio.putObject('testcases', objectName, testcase.file)
  if (versionId == null) {
    throw Error('Versioning not enabled on testcases bucket')
  }

  return { versionId, name: filename }
}

export async function consumeUploadSession (uploadId: string): Promise<{ domainId: string, problemId: string }> {
  const upload = await testcaseUploadCollection.findOneAndDelete({ id: uploadId })
  if (upload.value == null) {
    throw new UnauthorizedError('Invalid upload session token')
  }
  return upload.value
}
