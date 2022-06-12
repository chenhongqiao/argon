import { SubmissionLang, languageConfigs } from '../configs/languages.config'

import { BlobStorage } from '@project-carbon/common'

import * as path from 'path'

import { exec } from '../utils/system.util'
import {
  runInSandbox,
  Constraints,
  SandboxMemoryExceeded,
  SandboxRuntimeError,
  SandboxTimeExceeded,
  SandboxSystemError,
  SandboxStatus
} from './sandbox.service'

import { GraderTaskType } from '../start'

export enum JudgeStatus {
  Accepted = 'AC',
  WrongAnswer = 'WA',
}

interface SubmissionAccepted {
  status: JudgeStatus.Accepted
  message: string
  memory: number
  time: number
  wallTime: number
}

interface SubmissionWrongAnswer {
  status: JudgeStatus.WrongAnswer
  message: string
  memory: number
  time: number
  wallTime: number
}

export interface JudgeTask {
  type: GraderTaskType.Judge
  submissionID: string
  problemID: string
  constraints: Constraints
  language: SubmissionLang
}

export async function judgeSubmission (
  task: JudgeTask,
  box: number
): Promise<
  | SubmissionAccepted
  | SubmissionWrongAnswer
  | SandboxMemoryExceeded
  | SandboxRuntimeError
  | SandboxTimeExceeded
  | SandboxSystemError
  > {
  const workDir = `/var/local/lib/isolate/${box}/box`
  const config = languageConfigs[task.language]
  await BlobStorage.downloadToDisk(
    path.join(workDir, config.binaryFile),
    'binaries',
    task.submissionID
  )

  await BlobStorage.downloadToDisk(
    path.join(workDir, 'in.txt'),
    'testcases',
    `${task.submissionID}.in`
  )

  let command = config.compileCommand
  command = command.replaceAll('{binary_path}', config.binaryFile)
  const sandboxResult = await runInSandbox(
    {
      command,
      constrains: task.constraints,
      inputPath: 'in.txt',
      outputPath: 'out.txt'
    },
    box
  )
  if (sandboxResult.status === SandboxStatus.Succeeded) {
    const correctHash = await BlobStorage.getBlobHash(
      'testcases',
      `${task.submissionID}.out`
    )
    await exec(`sed 's/[ \t]*$//' -i ${path.join(workDir, 'out.txt')}`)
    await exec(
      `sed -e :a -e '/^\n*$/{$d;N;};/\n$/ba' -i ${path.join(
        workDir,
        'out.txt'
      )}`
    )
    const md5sum = await exec(`md5sum ${path.join(workDir, 'out.txt')}`)
    const { time, wallTime, memory } = sandboxResult
    if (md5sum.stdout.trimEnd() === correctHash.md5) {
      return {
        status: JudgeStatus.Accepted,
        time,
        wallTime,
        memory,
        message: 'Submission accepted'
      }
    } else {
      return {
        status: JudgeStatus.WrongAnswer,
        time,
        wallTime,
        memory,
        message: 'Wrong answer'
      }
    }
  } else {
    return sandboxResult
  }
}
