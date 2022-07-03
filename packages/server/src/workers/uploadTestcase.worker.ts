import { parentPort, workerData } from 'node:worker_threads'

import { cleanTestcase, uploadBuffer } from '@project-carbon/shared'

const { data } = workerData
const cleaned = cleanTestcase(data)

uploadBuffer(cleaned, { containerName: 'testcases', blobName: workerData.testcaseID }).then((result) => {
  parentPort?.postMessage({ testcaseID: result.blobName })
}).catch((err) => {
  throw err
})
