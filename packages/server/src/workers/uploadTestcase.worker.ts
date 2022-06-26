import { parentPort, workerData } from 'node:worker_threads'

import { uploadBuffer, cleanTestcase } from '@project-carbon/shared'

const { data } = workerData
const cleaned = cleanTestcase(data)

uploadBuffer(cleaned, { containerName: 'testcases', blobName: workerData.id }).then((result) => {
  parentPort?.postMessage({ testcaseID: result.blobName })
}).catch((err) => {
  throw err
})
