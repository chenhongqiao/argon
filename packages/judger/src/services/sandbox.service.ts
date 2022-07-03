import { exec } from '../utils/system.util'

import {
  ConflictError,
  NotFoundError,
  readFile,
  Constraints,
  SandboxStatus,
  SandboxRuntimeError,
  SandboxSystemError,
  SandboxTimeExceeded,
  SandboxMemoryExceeded
} from '@project-carbon/shared'

async function parseMeta (metaStr: string): Promise<any> {
  const meta = metaStr.split('\n')
  const result: any = {}
  meta.forEach(row => {
    const pair = row.split(':')
    if (pair.length === 2) {
      if (pair[0] !== 'cg-mem') {
        result[pair[0]] = pair[1]
      } else {
        result.memory = pair[1]
      }
    }
  })
  return result
}

export async function initSandbox (
  boxID: number
): Promise<{ workDir: string, boxID: number }> {
  let workDir = ''
  try {
    workDir = (await exec(`isolate --box-id=${boxID} --cg --init`)).stdout
  } catch (err: any) {
    if (Boolean((err.message?.startsWith('Box already exists')))) {
      throw new ConflictError('Box already exists', `sandbox ${boxID}`)
    } else {
      throw err
    }
  }
  return { workDir, boxID }
}

export async function destroySandbox (boxID: number): Promise<{ boxID: number }> {
  await exec(`isolate --box-id=${boxID} --cleanup`)
  return { boxID }
}

export interface SandboxTask {
  command: string
  inputPath?: string
  outputPath?: string
  stderrPath?: string
  constraints: Constraints
  env?: string
}

interface SandboxSucceeded {
  status: SandboxStatus.Succeeded
  message: string
  memory: number
  time: number
  wallTime: number
}

export async function runInSandbox (
  task: SandboxTask,
  boxID: number
): Promise<
  SandboxSucceeded | SandboxMemoryExceeded | SandboxSystemError | SandboxTimeExceeded | SandboxRuntimeError
  > {
  let command = `isolate --run --cg --box-id=${boxID} --meta=/var/local/lib/isolate/${boxID}/meta.txt`

  if (task.constraints.memory != null) {
    command += ' ' + `--cg-mem=${task.constraints.memory}`
  }
  if (task.constraints.time != null) {
    command += ' ' + `--time=${task.constraints.time / 1000.0}`
    if (task.constraints.wallTime == null) {
      command += ' ' + `--wall-time=${(task.constraints.time / 1000.0) * 3}`
    }
  }
  if (task.constraints.wallTime != null) {
    command += ' ' + `--wall-time=${task.constraints.wallTime / 1000.0}`
  }
  if (task.constraints.totalStorage != null) {
    command += ' ' + `--fsize=${task.constraints.totalStorage}`
  }
  if (task.constraints.processes != null) {
    command += ' ' + `--processes=${task.constraints.processes}`
  }
  if (task.env != null) {
    command += ' ' + `--env=${task.env}`
  }
  if (task.outputPath != null) {
    command += ' ' + `--stdout=${task.outputPath}`
  }
  if (task.stderrPath != null) {
    command += ' ' + `--stderr=${task.stderrPath}`
  }
  command += ' -- ' + task.command

  console.log(command)

  try {
    await exec(command)
  } catch (err) {
    let meta: string
    try {
      meta = (
        await readFile(`/var/local/lib/isolate/${boxID}/meta.txt`)
      ).data.toString()
    } catch (err) {
      if (err instanceof NotFoundError) {
        return {
          status: SandboxStatus.SystemError,
          message: 'Meta file does not exist on abnormal termination'
        }
      } else {
        throw err
      }
    }

    const result: any = await parseMeta(meta)

    switch (result.status) {
      case 'XX':
        return {
          status: SandboxStatus.SystemError,
          message: result.message ?? 'Isolate threw system error'
        }
      case 'RE':
        return {
          status: SandboxStatus.RuntimeError,
          message: result.message ?? 'Isolate threw runtime error'
        }
      case 'CG':
        if (
          (task.constraints.memory != null) &&
          result.exitsig === '9' &&
          (Boolean(result.memory)) &&
          parseInt(result.memory) > task.constraints.memory
        ) {
          return {
            status: SandboxStatus.MemoryExceeded,
            message: 'Memory limit exceeded',
            memory: parseInt(result.memory)
          }
        } else {
          return {
            status: SandboxStatus.RuntimeError,
            message: result.message ?? 'Program exit on signal'
          }
        }
      case 'TO':
        return {
          status: SandboxStatus.TimeExceeded,
          message: result.message ?? 'Isolate reported timeout',
          time: parseInt((parseFloat(result.time) * 1000).toFixed()),
          wallTime: parseInt(
            (parseFloat(result['time-wall']) * 1000).toFixed()
          )
        }
      default:
        return {
          status: SandboxStatus.SystemError,
          message: 'Unknown status on abnormal termination'
        }
    }
  }

  let meta: string
  try {
    meta = (
      await readFile(`/var/local/lib/isolate/${boxID}/meta.txt`)
    ).data.toString()
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        status: SandboxStatus.SystemError,
        message: 'Meta file does not exist on abnormal termination'
      }
    } else {
      throw err
    }
  }

  const result: any = await parseMeta(meta)
  return {
    status: SandboxStatus.Succeeded,
    time: parseInt((parseFloat(result.time) * 1000).toFixed()),
    wallTime: parseInt((parseFloat(result['time-wall']) * 1000).toFixed()),
    memory: parseInt(result.memory),
    message: 'Task completed successfully'
  }
}
