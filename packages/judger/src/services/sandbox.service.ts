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

interface SandboxMeta {
  status?: string
  memory?: number
  time?: number
  'wall-time'?: number
  exitsig?: number
  message?: string
}

function parseMeta (metaStr: string): SandboxMeta {
  const result: SandboxMeta = {}
  metaStr.split('\n').forEach(row => {
    const pair = row.split(':')
    const key = pair[0]
    const value = pair[1]
    if (key === 'status') {
      result.status = value
    } else if (key === 'cg-mem') {
      result.memory = parseInt(value)
    } else if (key === 'time') {
      result.time = parseInt((parseFloat(value) * 1000).toFixed())
    } else if (key === 'wall-time') {
      result['wall-time'] = parseInt((parseFloat(value) * 1000).toFixed())
    } else if (key === 'exitsig') {
      result.exitsig = parseInt(value)
    } else if (key === 'message') {
      result.message = value
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
  } catch (err) {
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

  let abnormalTermination = false
  try {
    await exec(command)
  } catch (err) {
    abnormalTermination = true
  }

  let meta: string
  try {
    meta = (await readFile(`/var/local/lib/isolate/${boxID}/meta.txt`)).data.toString()
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

  const result = parseMeta(meta)

  switch (result.status) {
    case 'XX':
      return {
        status: SandboxStatus.SystemError,
        message: result.message ?? 'Isolate threw system error.'
      }
    case 'RE':
      return {
        status: SandboxStatus.RuntimeError,
        message: result.message ?? 'Isolate threw runtime error.'
      }
    case 'CG':
      if (
        (task.constraints.memory != null) &&
        result.exitsig === 9 &&
        result.memory != null &&
        result.memory > task.constraints.memory
      ) {
        return {
          status: SandboxStatus.MemoryExceeded,
          message: 'Memory limit exceeded.',
          memory: result.memory
        }
      } else {
        return {
          status: SandboxStatus.RuntimeError,
          message: result.message ?? 'Program exit on signal.'
        }
      }
    case 'TO':
      if (result.time == null || result['time-wall'] == null) {
        return {
          status: SandboxStatus.SystemError,
          message: 'Isolate reported timeout but no time info found in meta.'
        }
      }
      return {
        status: SandboxStatus.TimeExceeded,
        message: result.message ?? 'Isolate reported timeout',
        time: result.time,
        wallTime: result['time-wall']
      }
    case 'OK':
      if (result.time == null || result['time-wall'] == null || result.memory == null) {
        return {
          status: SandboxStatus.SystemError,
          message: 'Isolate reported OK but no time info or memory info found in meta.'
        }
      }
      return {
        status: SandboxStatus.Succeeded,
        time: result.time,
        wallTime: result['time-wall'],
        memory: result.memory,
        message: 'Task completed successfully.'
      }
    default:
      return {
        status: SandboxStatus.SystemError,
        message: `Unknown status on ${abnormalTermination ? 'abnormal' : 'normal'} termination.`
      }
  }
}
