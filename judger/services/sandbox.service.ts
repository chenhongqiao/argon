import {exec} from '../utils/system.util';

import {ConflictError, NotFoundError} from '../../common/classes/error.class';

import * as FileSystem from '../../common/databases/fileSystem.infra';

async function parseMeta(metaStr: string) {
  const meta = metaStr.split('\n');
  const result: any = {};
  meta.forEach(row => {
    const pair = row.split(':');
    if (pair.length === 2) {
      if (pair[0] !== 'cg-mem') {
        result[pair[0]] = pair[1];
      } else {
        result['memory'] = pair[1];
      }
    }
  });
  return result;
}

export async function init(
  box: number
): Promise<{workDir: string; box: number}> {
  let workDir = '';
  try {
    workDir = (await exec(`isolate --box-id=${box} --cg --init`)).stdout;
  } catch (err: any) {
    if (err.message.startsWith('Box already exists')) {
      throw new ConflictError('Box already exists', `sandbox ${box}`);
    } else {
      throw err;
    }
  }
  return {workDir, box};
}

export async function destroy(box: number): Promise<{box: number}> {
  await exec(`isolate --box-id=${box} --cleanup`);
  return {box};
}

export enum Status {
  Succeeded = 'OK',
  MemoryExceeded = 'MLE',
  TimeExceeded = 'TLE',
  RuntimeError = 'RE',
  SystemError = 'SE',
}

export interface Constraints {
  memory?: number;
  time?: number;
  wallTime?: number;
  totalStorage?: number;
  processes?: number;
}

export interface Task {
  command: string;
  inputPath?: string;
  outputPath?: string;
  stderrPath?: string;
  constrains: Constraints;
  env?: string;
}

interface Succeeded {
  status: Status.Succeeded;
  message: string;
  memory: number;
  time: number;
  wallTime: number;
}

export interface MemoryExceeded {
  status: Status.MemoryExceeded;
  message: string;
  memory: number;
}

export interface TimeExceeded {
  status: Status.TimeExceeded;
  message: string;
  time: number;
  wallTime: number;
}

export interface RuntimeError {
  status: Status.RuntimeError;
  message: string;
}

export interface SystemError {
  status: Status.SystemError;
  message: string;
}

export async function run(
  task: Task,
  box: number
): Promise<
  Succeeded | MemoryExceeded | SystemError | TimeExceeded | RuntimeError
> {
  let command = `isolate --run --cg --box-id=${box} --meta=/var/local/lib/isolate/${box}/meta.txt`;

  if (task.constrains.memory) {
    command += ' ' + `--cg-mem=${task.constrains.memory}`;
  }
  if (task.constrains.time) {
    command += ' ' + `--time=${task.constrains.time / 1000.0}`;
    if (!task.constrains.wallTime) {
      command += ' ' + `--wall-time=${(task.constrains.time / 1000.0) * 3}`;
    }
  }
  if (task.constrains.wallTime) {
    command += ' ' + `--wall-time=${task.constrains.wallTime / 1000.0}`;
  }
  if (task.constrains.totalStorage) {
    command += ' ' + `--fsize=${task.constrains.totalStorage}`;
  }
  if (task.constrains.processes) {
    command += ' ' + `--processes=${task.constrains.processes}`;
  }
  if (task.env) {
    command += ' ' + `--env=${task.env}`;
  }
  if (task.outputPath) {
    command += ' ' + `--stdout=${task.outputPath}`;
  }
  if (task.stderrPath) {
    command += ' ' + `--stderr=${task.stderrPath}`;
  }
  command += ' -- ' + task.command;

  console.log(command);

  try {
    await exec(command);
  } catch (err) {
    let meta: string;
    try {
      meta = (
        await FileSystem.read(`/var/local/lib/isolate/${box}/meta.txt`)
      ).data.toString();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return {
          status: Status.SystemError,
          message: 'Meta file does not exist on abnormal termination',
        };
      } else {
        throw err;
      }
    }

    const result: any = await parseMeta(meta);

    switch (result['status']) {
      case 'XX':
        return {
          status: Status.SystemError,
          message: result['message'] || 'Isolate threw system error',
        };
      case 'RE':
        return {
          status: Status.RuntimeError,
          message: result['message'] || 'Isolate threw runtime error',
        };
      case 'CG':
        if (
          task.constrains.memory &&
          result['exitsig'] === '9' &&
          result['memory'] &&
          parseInt(result['memory']) > task.constrains.memory
        ) {
          return {
            status: Status.MemoryExceeded,
            message: 'Memory limit exceeded',
            memory: parseInt(result['memory']),
          };
        } else {
          return {
            status: Status.RuntimeError,
            message: result['message'] || 'Program exit on signal',
          };
        }
      case 'TO':
        return {
          status: Status.TimeExceeded,
          message: result['message'] || 'Isolate reported timeout',
          time: parseInt((parseFloat(result['time']) * 1000).toFixed()),
          wallTime: parseInt(
            (parseFloat(result['time-wall']) * 1000).toFixed()
          ),
        };
      default:
        return {
          status: Status.SystemError,
          message: 'Unknown status on abnormal termination',
        };
    }
  }

  let meta: string;
  try {
    meta = (
      await FileSystem.read(`/var/local/lib/isolate/${box}/meta.txt`)
    ).data.toString();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return {
        status: Status.SystemError,
        message: 'Meta file does not exist on abnormal termination',
      };
    } else {
      throw err;
    }
  }

  const result: any = await parseMeta(meta);
  return {
    status: Status.Succeeded,
    time: parseInt((parseFloat(result['time']) * 1000).toFixed()),
    wallTime: parseInt((parseFloat(result['time-wall']) * 1000).toFixed()),
    memory: parseInt(result['memory']),
    message: 'Task completed successfully',
  };
}
