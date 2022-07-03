import {
  languageConfigs, downloadToDisk, getBlobHash, SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@project-carbon/shared'

import path = require('path')

import { exec } from '../utils/system.util'
import {
  runInSandbox
} from './sandbox.service'

export async function gradeSubmission (
  task: GradingTask,
  boxID: number
): Promise<GradingResult> {
  const workDir = `/var/local/lib/isolate/${boxID}/box`
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
      blobName: task.testcase.input
    }
  )

  let command = config.compileCommand
  command = command.replaceAll('{binary_path}', config.binaryFile)
  const sandboxResult = await runInSandbox(
    {
      command,
      constraints: task.constraints,
      inputPath: 'in.txt',
      outputPath: 'out.txt'
    },
    boxID
  )
  if (sandboxResult.status === SandboxStatus.Succeeded) {
    const correctHash = await getBlobHash(
      {
        containerName: 'testcases',
        blobName: task.testcase.output
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
        status: GradingStatus.Accepted,
        time,
        wallTime,
        memory,
        message: 'Submission accepted'
      }
    } else {
      return {
        status: GradingStatus.WrongAnswer,
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
