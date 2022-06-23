import * as path from 'path'
import { promises as fs } from 'fs'

import { runInSandbox } from './sandbox.service'

import { uploadFromDisk, readFile, languageConfigs, CompileTask, SandboxStatus, CompileSucceeded, CompileFailed, CompileStatus } from '@project-carbon/shared'

export async function compileSubmission (task: CompileTask, box: number): Promise<CompileSucceeded|CompileFailed> {
  const workDir = `/var/local/lib/isolate/${box}/box`
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
      constrains: task.constrains,
      command,
      stderrPath: 'log.txt',
      env: 'PATH=/bin:/usr/local/bin:/usr/bin'
    },
    box
  )
  if (result.status === SandboxStatus.Succeeded) {
    await uploadFromDisk(binaryPath, { containerName: 'binaries', blobName: task.submissionID })
    return {
      status: CompileStatus.Succeeded,
      submissionID: task.submissionID
    }
  } else {
    const log = (await readFile(logPath)).data.toString()
    console.log(logPath)
    return {
      status: CompileStatus.Failed,
      submissionID: task.submissionID,
      log
    }
  }
}
