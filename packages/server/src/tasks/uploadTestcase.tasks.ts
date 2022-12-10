import { parentPort, workerData } from 'node:worker_threads'

import { uploadBuffer, cleanTestcase, readFile } from '@aocs/libraries'

const { testcasePath, testcaseId, domainId } = workerData
readFile(testcasePath).then((result) => {
  const cleaned = cleanTestcase(result.data)
  uploadBuffer(cleaned, { containerName: 'testcases', blobName: testcaseId }, 'text/plain', { domainid: domainId }).then((result) => {
    parentPort?.postMessage({ testcaseId: result.blobName })
  }).catch((err) => {
    throw err
  })
}).catch((err) => {
  throw err
})
