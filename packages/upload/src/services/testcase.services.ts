import { PassThrough } from 'node:stream'
import { minio, trimTestcase } from '@argoncs/libraries'
import { MultipartFile } from '@fastify/multipart'
import path = require('node:path')

export async function uploadTestcase (domainId: string, problemId: string, testcase: MultipartFile): Promise<{ versionId: string, filename: string }> {
  const filename = testcase.filename.replaceAll('/', '.')
  const objectName = path.join(domainId, problemId, filename)
  const trimmed = new PassThrough()
  await trimTestcase(testcase.file, trimmed)
  const { versionId } = await minio.putObject('testcases', objectName, trimmed)
  if (versionId == null) {
    throw Error('Versioning not enabled on testcases bucket.')
  }

  return { versionId, filename }
}
