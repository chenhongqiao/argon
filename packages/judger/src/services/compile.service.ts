import path = require('path')
import { promises as fs } from 'fs'

import { runInSandbox } from './sandbox.service'

import { uploadFromDisk, readFile, languageConfigs, CompilingTask, SandboxStatus, CompileSucceeded, CompileFailed, CompilingStatus } from '@chenhongqiao/carbon-common'

export async function compileSubmission (task: CompilingTask, boxID: number): Promise<CompileSucceeded|CompileFailed> {
  const workDir = `/var/local/lib/isolate/${boxID}/box`
  const config = languageConfigs[task.language]
  const srcPath = path.join(workDir, config.srcFile)
  const binaryPath = path.join(workDir, config.binaryFile)
  const logPath = path.join(workDir, 'log.txt')
  await fs.writeFile(srcPath, task.source)
  let command = config.compileCommand
  command = command.replaceAll('{src_path}', config.srcFile)
  command = command.replaceAll('{binary_path}', config.binaryFile)
  console.log(command)
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
    console.log(logPath)
    return {
      status: CompilingStatus.Failed,
      log
    }
  }
}
