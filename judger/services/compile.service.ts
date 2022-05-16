import type {CompileTask} from '../../common/interfaces/judger/compile.interface';
import {languageConfigs} from '../../common/configs/judger/languages';
import * as path from 'path';
import {promises as fs} from 'fs';

import {SandboxService} from './sandbox.service';

class CompileService {
  static async compile(task: CompileTask, box: number, workDir: string) {
    const config = languageConfigs[task.language];
    const srcPath = path.join(workDir, config.srcFile);
    const binaryPath = path.join(workDir, config.binaryFile);
    const logPath = path.join(workDir, 'log.txt');
    await fs.writeFile(srcPath, task.source);
    const command = config.compileCommand;
    command.replaceAll('{src_path}', srcPath);
    command.replaceAll('{binary_path}', binaryPath);
    const result = await SandboxService.run(box, {
      constrains: task.constrains,
      command,
      outputPath: logPath,
    });
  }
}

export {CompileService};
