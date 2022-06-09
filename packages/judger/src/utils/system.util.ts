import cp = require('child_process');
import util = require('util');

export const exec = util.promisify(cp.exec);

export async function chmodx(path: string) {
  await exec(`chmod +x ${path}`);
}
