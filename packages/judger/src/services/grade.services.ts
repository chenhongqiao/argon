import {
  SandboxStatus, GradingStatus, GradingTask, GradingResult
} from '@argoncs/types'
import { downloadToDisk, getBlobHash } from '@argoncs/libraries'
import { languageConfigs } from '@argoncs/configs'

import path = require('node:path')

import { Worker } from 'node:worker_threads'

import { makeExecutable } from '../utils/system.utils'
import {
  runInSandbox
} from './sandbox.services'

export async function gradeSubmission (
  task: GradingTask,
  boxId: number
): Promise<GradingResult> {
  const workDir = `/var/local/lib/isolate/${boxId}/box`
  const config = languageConfigs[task.language]
  await downloadToDisk(
    path.join(workDir, config.binaryFile),
    {
      containerName: 'binaries',
      blobName: task.submissionId
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
    boxId
  )
  if (sandboxResult.status === SandboxStatus.Succeeded) {
    const correctHash = await getBlobHash(
      {
        containerName: 'testcases',
        blobName: task.testcase.output
      }
    )
    const outputHash: { md5: string } = await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../tasks/calculateTestcaseHash.tasks.js'), {
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
