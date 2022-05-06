import cp = require('child_process');
import util = require('util');

const exec = util.promisify(cp.exec);

export {exec};
