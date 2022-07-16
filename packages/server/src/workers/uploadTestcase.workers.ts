import { parentPort, workerData } from 'node:worker_threads'

import { uploadBuffer, cleanTestcase, readFile } from '@pccs/common'

const { testcasePath, testcaseID } = workerData
readFile(testcasePath).then((result) => {
  const cleaned = cleanTestcase(result.data)
  uploadBuffer(cleaned, { containerName: 'testcases', blobName: testcaseID }, 'text/plain').then((result) => {
    parentPort?.postMessage({ testcaseID: result.blobName })
  }).catch((err) => {
    throw err
  })
}).catch((err) => {
  throw err
})
