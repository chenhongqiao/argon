import { PassThrough, Readable } from 'stream'
import es = require('event-stream')
import { pipeline } from 'stream/promises'

export async function trimTestcase (input: Readable, output: PassThrough): Promise<void> {
  return await pipeline(
    input,
    es.split(),
    // eslint-disable-next-line array-callback-return
    es.map((line: string, cb: any) => {
      const trimmed = line.trimEnd()
      if (trimmed !== '') {
        cb(null, trimmed + '\n')
      } else {
        cb(null, '')
      }
    }),
    output
  )
}
