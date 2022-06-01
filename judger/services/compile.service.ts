import {languageConfigs} from '../configs/languages.config';
import * as path from 'path';
import {promises as fs} from 'fs';

import {SandboxService} from './sandbox.service';
import {Constraints, SandboxStatus} from './sandbox.service';

import {SubmissionLang} from '../configs/languages.config';

import {BlobStorage} from '../infras/blobStorage.infra';

import {FileSystem} from '../infras/fileSystem.infra';

import {TaskType} from '../main';

export interface CompileTask {
  type: TaskType.Compile;
  source: string;
  constrains: Constraints;
  language: SubmissionLang;
  submissionID: string;
}

interface CompileResult {
  success: boolean;
  submissionID: string;
  log?: string;
}

export class CompileService {
  static async compile(task: CompileTask, box: number): Promise<CompileResult> {
    const workDir = `/var/local/lib/isolate/${box}/box`;
    const config = languageConfigs[task.language];
    const srcPath = path.join(workDir, config.srcFile);
    const binaryPath = path.join(workDir, config.binaryFile);
    const logPath = path.join(workDir, 'log.txt');
    await fs.writeFile(srcPath, task.source);
    let command = config.compileCommand;
    command = command.replaceAll('{src_path}', config.srcFile);
    command = command.replaceAll('{binary_path}', config.binaryFile);
    console.log(command);
    const result = await SandboxService.run(
      {
        constrains: task.constrains,
        command,
        stderrPath: 'log.txt',
        env: 'PATH=/bin:/usr/local/bin:/usr/bin',
      },
      box
    );
    if (result.status === SandboxStatus.Succeeded) {
      await BlobStorage.uploadFromDisk(
        binaryPath,
        'binaries',
        task.submissionID
      );
      return {
        success: true,
        submissionID: task.submissionID,
      };
    } else {
      const log = (await FileSystem.read(logPath)).toString();
      console.log(logPath);
      return {
        success: false,
        submissionID: task.submissionID,
        log,
      };
    }
  }
}
