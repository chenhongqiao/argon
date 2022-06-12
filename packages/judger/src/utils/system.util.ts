import cp = require('child_process')
import util = require('util')

export const exec = util.promisify(cp.exec)
