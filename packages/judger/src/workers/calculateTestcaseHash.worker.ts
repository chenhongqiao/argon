import { parentPort, workerData } from 'node:worker_threads'

import { cleanTestcase, readFile } from '@chenhongqiao/carbon-common'

import { createHash } from 'crypto'

const { testcasePath } = workerData
readFile(testcasePath).then((result) => {
  const cleaned = cleanTestcase(result.data)
  const hash = createHash('md5').update(cleaned).digest('base64')
  parentPort?.postMessage({ md5: hash })
}).catch((err) => {
  throw err
})
