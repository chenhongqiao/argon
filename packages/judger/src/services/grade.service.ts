import {
  languageConfigs, downloadToDisk, getBlobHash, SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@chenhongqiao/carbon-common'

import path = require('path')

import { Worker } from 'worker_threads'

import { makeExecutable } from '../utils/system.util'
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
    boxID
  )
  if (sandboxResult.status === SandboxStatus.Succeeded) {
    const correctHash = await getBlobHash(
      {
        containerName: 'testcases',
        blobName: task.testcase.output
      }
    )
    const outputHash: {md5: string} = await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../workers/calculateTestcaseHash.worker.js'), {
        workerData: { testcasePath: path.join(workDir, 'out.txt') }
      })
      worker.on('message', resolve)
      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`))
        }
      })
    })
    const { time, wallTime, memory } = sandboxResult
    if (outputHash.md5 === correctHash.md5) {
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
  } else {
    return sandboxResult
  }
}
