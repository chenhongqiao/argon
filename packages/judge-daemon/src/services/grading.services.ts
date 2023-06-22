import {
  SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@argoncs/types'
import { languageConfigs } from '../../configs/language.configs.js'

import path = require('node:path')
import { makeExecutable, exec } from '../utils/system.utils.js'
import {
  runInSandbox
} from './sandbox.services.js'

import { fetchBinary, fetchTestcase } from './storage.services.js'

export async function gradeSubmission (
  task: GradingTask,
  boxId: number
): Promise<GradingResult> {
  const workDir = `/var/local/lib/isolate/${boxId}/box`
  const config = languageConfigs[task.language]

  await fetchBinary(task.submissionId, path.join(workDir, config.binaryFile))

  await fetchTestcase(task.testcase.input.objectName, task.testcase.input.versionId, path.join(workDir, 'in.txt'))

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
    const answerPath = `/var/local/lib/isolate/${boxId}/ans.txt`
    await fetchTestcase(task.testcase.output.objectName, task.testcase.output.versionId, answerPath)
    const { time, wallTime, memory } = sandboxResult
    try {
      await exec(`diff -Z -B ${answerPath} ${path.join(workDir, 'out.txt')}`)
      return {
        status: GradingStatus.Accepted,
        time,
        wallTime,
        memory,
        message: 'Submission accepted'
      }
    } catch (err) {
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
