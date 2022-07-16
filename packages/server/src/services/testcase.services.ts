import { randomUUID } from 'node:crypto'
import { Worker } from 'node:worker_threads'

import { deleteBlob } from '@pccs/common'

import path = require('node:path')

export async function uploadTestcase (testcasePath: string): Promise<{testcaseID: string}> {
  const testcaseID = randomUUID()
  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/uploadTestcase.worker.js'), {
      workerData: { testcasePath, testcaseID }
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

export async function deleteTestcase (testcaseID: string): Promise<{testcaseID: string}> {
  await deleteBlob({ containerName: 'testcases', blobName: testcaseID })
  return { testcaseID: testcaseID }
}
