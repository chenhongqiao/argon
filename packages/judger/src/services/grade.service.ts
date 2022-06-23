import { languageConfigs, downloadToDisk, getBlobHash, SandboxStatus, GradeStatus, GradeTask, SubmissionAccepted, SubmissionWrongAnswer } from '@project-carbon/shared'

import * as path from 'path'

import { exec } from '../utils/system.util'
import {
  runInSandbox,
  SandboxMemoryExceeded,
  SandboxRuntimeError,
  SandboxSystemError,
  SandboxTimeExceeded
} from './sandbox.service'

export async function judgeSubmission (
  task: GradeTask,
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
  await downloadToDisk(
    path.join(workDir, config.binaryFile),
    {
      containerName: 'binaries',
      blobName: task.submissionID
    }
  )

  await downloadToDisk(
    path.join(workDir, 'in.txt'),
    {
      containerName: 'testcases',
      blobName: task.testcaseID.input
    }
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
    const correctHash = await getBlobHash(
      {
        containerName: 'testcases',
        blobName: task.testcaseID.output
      }
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
        status: GradeStatus.Accepted,
        time,
        wallTime,
        memory,
        message: 'Submission accepted'
      }
    } else {
      return {
        status: GradeStatus.WrongAnswer,
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
