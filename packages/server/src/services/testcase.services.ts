import { randomUUID } from 'node:crypto'
import { Worker } from 'node:worker_threads'

import { AuthorizationError, deleteBlob, getMetaData } from '@project-carbon/shared'

import path = require('node:path')

export async function uploadTestcase (testcasePath: string, domainId: string): Promise<{testcaseId: string}> {
  const testcaseId = randomUUID()
  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../tasks/uploadTestcase.tasks.js'), {
      workerData: { testcasePath, testcaseId, domainId }
    })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}.`))
      }
    })
  })
}

export async function verifyTestcaseDomain (testcaseId: string, domainId: string): Promise<{testcaseId: string}> {
  const meta = await getMetaData({ containerName: 'testcases', blobName: testcaseId })
  if (meta.domainId == null || meta.domainId !== domainId) {
    throw new AuthorizationError('Testcase does not belong to this domain', { domainId, testcaseId })
  }
  return { testcaseId }
}

export async function deleteTestcase (testcaseId: string): Promise<{testcaseId: string}> {
  await deleteBlob({ containerName: 'testcases', blobName: testcaseId })
  return { testcaseId: testcaseId }
}
