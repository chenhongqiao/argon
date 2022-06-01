import {Constraints, SandboxService} from './sandbox.service';

import {SubmissionLang, languageConfigs} from '../configs/languages.config';

import {BlobStorage} from '../infras/blobStorage.infra';
import * as path from 'path';

import {exec} from '../utils/system.util';

import {TaskType} from '../main';

import {
  SandboxMemoryExceeded,
  SandboxTimeExceeded,
  SandboxRuntimeError,
  SandboxSystemError,
  SandboxStatus,
} from './sandbox.service';

export enum JudgeStatus {
  Accepted = 'AC',
  WrongAnswer = 'WA',
}

interface SolutionAccepted {
  status: JudgeStatus.Accepted;
  message: string;
  memory: number;
  time: number;
  wallTime: number;
}

interface SolutionRejected {
  status: JudgeStatus.WrongAnswer;
  message: string;
  memory: number;
  time: number;
  wallTime: number;
}

export interface JudgeTask {
  type: TaskType.Judge;
  submissionID: string;
  problemID: string;
  constraints: Constraints;
  language: SubmissionLang;
}

export class JudgeService {
  static async judge(
    task: JudgeTask,
    box: number
  ): Promise<
    | SolutionAccepted
    | SolutionRejected
    | SandboxMemoryExceeded
    | SandboxRuntimeError
    | SandboxTimeExceeded
    | SandboxSystemError
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
    if (sandboxResult.status === SandboxStatus.Succeeded) {
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
      const {time, wallTime, memory} = sandboxResult;
      if (md5sum.stdout.trimEnd() === correctHash.md5) {
        return {
          status: JudgeStatus.Accepted,
          time,
          wallTime,
          memory,
          message: 'Submission accepted',
        };
      } else {
        return {
          status: JudgeStatus.WrongAnswer,
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
}
