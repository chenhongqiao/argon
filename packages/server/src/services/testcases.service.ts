import { randomUUID } from 'crypto'
import { Worker } from 'node:worker_threads'

import { MultipartFile } from '@fastify/multipart'

import { deleteBlob } from '@project-carbon/shared'

import path = require('path')

export async function uploadTestcase (testcase: MultipartFile): Promise<{testcaseID: string}> {
  const testcaseID = randomUUID()
  const data = (await testcase.toBuffer()).toString()
  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/uploadTestcase.worker.js'), {
      workerData: { data, testcaseID }
    })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

export async function deleteTestcase (testcaseID: string): Promise<{testcaseID: string}> {
  const deletedBlob = await deleteBlob({ containerName: 'testcases', blobName: testcaseID })
  return { testcaseID: deletedBlob.containerName }
}
