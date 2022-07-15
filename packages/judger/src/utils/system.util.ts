import cp = require('node:child_process')
import util = require('node:util')

export const exec = util.promisify(cp.exec)

export async function makeExecutable (path: string): Promise<void> {
  await exec(`chmod +x ${path}`)
}
