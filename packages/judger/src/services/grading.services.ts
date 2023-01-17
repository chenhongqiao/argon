import {
  SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@argoncs/types'
import { minio } from '@argoncs/libraries'
import { languageConfigs } from '@argoncs/configs'

import path = require('node:path')
import { makeExecutable } from '../utils/system.utils'
import {
  runInSandbox
} from './sandbox.services'

import { spawn, Thread, Worker } from 'threads'

export async function gradeSubmission (
  task: GradingTask,
  boxId: number
): Promise<GradingResult> {
  const workDir = `/var/local/lib/isolate/${boxId}/box`
  const config = languageConfigs[task.language]

  await minio.fGetObject('binaries', task.submissionId, path.join(workDir, config.binaryFile))
  await minio.fGetObject('testcases', task.testcase.input.objectName, path.join(workDir, 'in.txt'))

  await makeExecutable(path.join(workDir, config.binaryFile))

  let command = config.executeCommand
  command = command.replaceAll('{binary_path}', config.binaryFile)
  const sandboxResult = await runInSandbox(
    {
      command,
      constraints: task.constraints,
      inputPath: 'in.txt',
      outputPath: 'out.txt'
    },
    boxId
  )
  if (sandboxResult.status === SandboxStatus.Succeeded) {
    const correctHash = (await minio.statObject('testcases', task.testcase.input.objectName, { versionId: task.testcase.input.versionId })).etag
    const hashWorker = await spawn(new Worker('../workers/testcase.workers'))
    try {
      const outputHash = await hashWorker(path.join(workDir, 'out.txt'))
      const { time, wallTime, memory } = sandboxResult
      if (outputHash.md5 === correctHash) {
        return {
          status: GradingStatus.Accepted,
          time,
          wallTime,
          memory,
          message: 'Submission Accepted.'
        }
      } else {
        return {
          status: GradingStatus.WrongAnswer,
          time,
          wallTime,
          memory,
          message: 'Wrong Answer.'
        }
      }
    } finally {
      await Thread.terminate(hashWorker)
    }
  } else {
    return sandboxResult
  }
}
