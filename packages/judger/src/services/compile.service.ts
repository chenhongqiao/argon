import * as path from 'path';
import { promises as fs } from 'fs';

import { languageConfigs } from '../configs/languages.config';
import { SubmissionLang } from '../configs/languages.config';

import * as SandboxService from './sandbox.service';

import { BlobStorage } from '@project-carbon/common';
import { FileSystem } from '@project-carbon/common';

import { TaskType } from '../start';

export interface Task {
  type: TaskType.Compile;
  source: string;
  constrains: SandboxService.Constraints;
  language: SubmissionLang;
  submissionID: string;
}

interface CompileResult {
  success: boolean;
  submissionID: string;
  log?: string;
}

export async function compile(task: Task, box: number): Promise<CompileResult> {
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
  if (result.status === SandboxService.Status.Succeeded) {
    await BlobStorage.uploadFromDisk(binaryPath, 'binaries', task.submissionID);
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
