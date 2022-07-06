import cp = require('child_process')
import util = require('util')

export const exec = util.promisify(cp.exec)

export async function makeExecutable (path: string): Promise<void> {
  await exec(`chmod +x ${path}`)
}
