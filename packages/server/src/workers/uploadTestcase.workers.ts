import { parentPort, workerData } from 'node:worker_threads'

import { uploadBuffer, cleanTestcase, readFile } from '@project-carbon/shared'

const { testcasePath, testcaseId } = workerData
readFile(testcasePath).then((result) => {
  const cleaned = cleanTestcase(result.data)
  uploadBuffer(cleaned, { containerName: 'testcases', blobName: testcaseId }, 'text/plain').then((result) => {
    parentPort?.postMessage({ testcaseId: result.blobName })
  }).catch((err) => {
    throw err
  })
}).catch((err) => {
  throw err
})
