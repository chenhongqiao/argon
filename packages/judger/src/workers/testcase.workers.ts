import { expose } from 'threads/worker'

import { trimTestcase } from '@argoncs/libraries'

import { createHash } from 'node:crypto'

import { promises as fs } from 'fs'
import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'

expose(async function (testcasePath: string): Promise<string> {
  const file = (await fs.open(testcasePath)).createReadStream()
  const trimmed = new PassThrough()
  await trimTestcase(file, trimmed)
  const md5 = createHash('md5')
  await pipeline(trimmed, md5)
  return md5.digest('hex')
})
