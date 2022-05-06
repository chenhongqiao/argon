import type {CompileTask} from '../../common/interfaces/judger/compile.interface'
import * as path from 'path';
import {promises as fs} from 'fs';

import {exec} from 'child_process';
import util = require('util');
const cmd = util.promisify(exec);

class CompileService {
  static async compile(task: CompileTask, box: number, workDir: string) {
    const srcPath = path.join(workDir, 'program.cpp');
    await fs.writeFile(srcPath, task.source);
    const command = 'isolate';
  }
}

export {CompileService};
