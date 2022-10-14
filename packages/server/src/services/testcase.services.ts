import { randomUUID } from 'node:crypto'
import { Worker } from 'node:worker_threads'

import { deleteBlob } from '@project-carbon/shared'

import path = require('node:path')

export async function uploadTestcase (testcasePath: string): Promise<{testcaseId: string}> {
  const testcaseId = randomUUID()
  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/uploadTestcase.worker.js'), {
      workerData: { testcasePath, testcaseId }
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

export async function deleteTestcase (testcaseId: string): Promise<{testcaseId: string}> {
  await deleteBlob({ containerName: 'testcases', blobName: testcaseId })
  return { testcaseId: testcaseId }
}
