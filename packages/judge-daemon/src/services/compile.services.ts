import path = require('node:path')
import { promises as fs } from 'node:fs'

import { runInSandbox } from './sandbox.services.js'

import { type CompilingTask, SandboxStatus, type CompileSucceeded, type CompileFailed, CompilingStatus } from '@argoncs/types'
import { minio } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

export async function compileSubmission (task: CompilingTask, boxId: number): Promise<CompileSucceeded | CompileFailed> {
  const workDir = `/var/local/lib/isolate/${boxId}/box`
  const config = languageConfigs[task.language]
  const srcPath = path.join(workDir, config.srcFile)
  const binaryPath = path.join(workDir, config.binaryFile)
  const logPath = path.join(workDir, 'log.txt')
  await fs.writeFile(srcPath, task.source)
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
    boxId
  )
  if (result.status === SandboxStatus.Succeeded) {
    await minio.fPutObject('binaries', task.submissionId, binaryPath)
    return {
      status: CompilingStatus.Succeeded
    }
  } else {
    const log = (await fs.readFile(logPath)).toString()
    return {
      status: CompilingStatus.Failed,
      log
    }
  }
}
