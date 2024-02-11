import { minio, testcaseUploadCollection } from '@argoncs/common'
import { type MultipartFile } from '@fastify/multipart'
import { UnauthorizedError } from 'http-errors-enhanced'
import path from 'node:path'
import type internal from 'node:stream'

/* Uploads a MultipartFile to testcases. Warps 'uploadFile(..)' */
export async function uploadTestcase (
  domainId: string,
  problemId: string,
  testcase: MultipartFile
): Promise<{ versionId: string, name: string }> {
  const filename = testcase.filename.replaceAll('/', '.')
  return await uploadFile(domainId, problemId, filename, testcase.file)
}

/* Uploads a single file into 'testcases' */
export async function uploadFile (
  domainId: string,
  problemId: string,
  filename: string,
  stream: internal.Readable
): Promise<{ versionId: string, name: string }> {
  const objectName = path.join(domainId, problemId, filename)
  const { versionId } = await minio.putObject('testcases', objectName, stream)
  if (versionId == null) {
    throw Error('Versioning not enabled on testcases bucket')
  }

  return { versionId, name: filename }
}

/* Consumes an upload session, returns the domain and problem authorized */
export async function consumeUploadSession (uploadId: string): Promise<{ domainId: string, problemId: string }> {
  const upload = await testcaseUploadCollection.findOneAndDelete({ id: uploadId })
  if (upload == null) {
    throw new UnauthorizedError('Invalid upload session token')
  }
  return upload
}
