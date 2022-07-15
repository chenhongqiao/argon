import path = require('node:path')
import { promises as fs } from 'node:fs'

import { runInSandbox } from './sandbox.services'

import { uploadFromDisk, readFile, languageConfigs, CompilingTask, SandboxStatus, CompileSucceeded, CompileFailed, CompilingStatus, CosmosDB, CompilingSubmission, NotFoundError, AzureError } from '@chenhongqiao/carbon-common'

const submissionsContainer = CosmosDB.container('submissions')

export async function compileSubmission (task: CompilingTask, boxID: number): Promise<CompileSucceeded|CompileFailed> {
  const { submissionID } = task
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource

  const workDir = `/var/local/lib/isolate/${boxID}/box`
  const config = languageConfigs[task.language]
  const srcPath = path.join(workDir, config.srcFile)
  const binaryPath = path.join(workDir, config.binaryFile)
  const logPath = path.join(workDir, 'log.txt')
  await fs.writeFile(srcPath, submission.source)
  let command = config.compileCommand
  command = command.replaceAll('{src_path}', config.srcFile)
  command = command.replaceAll('{binary_path}', config.binaryFile)
  const result = await runInSandbox(
    {
      constraints: task.constraints,
      command,
      stderrPath: 'log.txt',
      env: 'PATH=/bin:/usr/local/bin:/usr/bin'
    },
    boxID
  )
  if (result.status === SandboxStatus.Succeeded) {
    await uploadFromDisk(binaryPath, { containerName: 'binaries', blobName: task.submissionID })
    return {
      status: CompilingStatus.Succeeded
    }
  } else {
    const log = (await readFile(logPath)).data.toString()
    return {
      status: CompilingStatus.Failed,
      log
    }
  }
}
