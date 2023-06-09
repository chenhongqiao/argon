import {
  SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@argoncs/types'
import { minio } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

import path = require('node:path')
import { makeExecutable } from '../utils/system.utils.js'
import {
  runInSandbox
} from './sandbox.services.js'

import { spawn, Thread, Worker } from 'threads'
import fs from 'fs/promises'
import { fetchBinary, fetchTestcase } from './storage.services.js'

export async function gradeSubmission (
  task: GradingTask,
  boxId: number
): Promise<GradingResult> {
  const workDir = `/var/local/lib/isolate/${boxId}/box`
  const config = languageConfigs[task.language]

  const binaryPath = await fetchBinary(task.submissionId)
  await fs.copyFile(binaryPath, path.join(workDir, config.binaryFile))

  const testcasePath = await fetchTestcase(task.testcase.input.objectName, task.testcase.input.versionId)
  await fs.copyFile(testcasePath, path.join(workDir, 'in.txt'))

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
