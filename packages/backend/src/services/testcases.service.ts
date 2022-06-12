import { randomUUID } from 'crypto'
import { Worker } from 'node:worker_threads'

import { MultipartFile } from '@fastify/multipart'

import * as path from 'path'

export async function uploadTestcase (file: MultipartFile): Promise<{id: string}> {
  const testcaseID = randomUUID()
  const data = (await file.toBuffer()).toString()
  return await new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/uploadTestcase.worker.js'), {
      workerData: { data, id: testcaseID }
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
