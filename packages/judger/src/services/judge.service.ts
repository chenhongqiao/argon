import { SubmissionLang, languageConfigs } from '../configs/languages.config';

import { BlobStorage } from '@project-carbon/common';

import * as path from 'path';

import { exec } from '../utils/system.util';

import { TaskType } from '../start';

import * as SandboxService from './sandbox.service';

export enum Status {
  Accepted = 'AC',
  WrongAnswer = 'WA',
}

interface Accepted {
  status: Status.Accepted;
  message: string;
  memory: number;
  time: number;
  wallTime: number;
}

interface WrongAnswer {
  status: Status.WrongAnswer;
  message: string;
  memory: number;
  time: number;
  wallTime: number;
}

export interface Task {
  type: TaskType.Judge;
  submissionID: string;
  problemID: string;
  constraints: SandboxService.Constraints;
  language: SubmissionLang;
}

export async function judge(
  task: Task,
  box: number
): Promise<
  | Accepted
  | WrongAnswer
  | SandboxService.MemoryExceeded
  | SandboxService.RuntimeError
  | SandboxService.TimeExceeded
  | SandboxService.SystemError
> {
  const workDir = `/var/local/lib/isolate/${box}/box`;
  const config = languageConfigs[task.language];
  await BlobStorage.downloadToDisk(
    path.join(workDir, config.binaryFile),
    'binaries',
    task.submissionID
  );

  await BlobStorage.downloadToDisk(
    path.join(workDir, 'in.txt'),
    'testcases',
    `${task.submissionID}.in`
  );

  let command = config.compileCommand;
  command = command.replaceAll('{binary_path}', config.binaryFile);
  const sandboxResult = await SandboxService.run(
    {
      command,
      constrains: task.constraints,
      inputPath: 'in.txt',
      outputPath: 'out.txt',
    },
    box
  );
  if (sandboxResult.status === SandboxService.Status.Succeeded) {
    const correctHash = await BlobStorage.getBlobHash(
      'testcases',
      `${task.submissionID}.out`
    );
    await exec(`sed 's/[ \t]*$//' -i ${path.join(workDir, 'out.txt')}`);
    await exec(
      `sed -e :a -e '/^\n*$/{$d;N;};/\n$/ba' -i ${path.join(
        workDir,
        'out.txt'
      )}`
    );
    const md5sum = await exec(`md5sum ${path.join(workDir, 'out.txt')}`);
    const { time, wallTime, memory } = sandboxResult;
    if (md5sum.stdout.trimEnd() === correctHash.md5) {
      return {
        status: Status.Accepted,
        time,
        wallTime,
        memory,
        message: 'Submission accepted',
      };
    } else {
      return {
        status: Status.WrongAnswer,
        time,
        wallTime,
        memory,
        message: 'Wrong answer',
      };
    }
  } else {
    return sandboxResult;
  }
}
