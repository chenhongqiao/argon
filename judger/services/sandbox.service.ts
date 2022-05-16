import {exec} from '../utils/system.util';
import {promises as fs} from 'fs';
import {
  ServiceErrorCode,
  ServiceError,
} from '../../common/interfaces/error.interface';
import {
  SandboxTask,
  SandboxTaskResult,
  SandboxStatus,
} from '../../common/interfaces/judger/sandbox.interface';

class SandboxService {
  private static async parseMeta(metaStr: string) {
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

  static async init(
    box: number
  ): Promise<{workDir: string; box: number} | ServiceError> {
    let workDir = '';
    try {
      workDir = (await exec(`isolate --box-id=${box} --cg --init`)).stdout;
    } catch (err: any) {
      if (err.message.startsWith('Box already exists')) {
        return {error: ServiceErrorCode.Conflict};
      } else {
        throw err;
      }
    }
    return {workDir, box};
  }

  static async destroy(box: number): Promise<{box: number}> {
    await exec(`isolate --box-id=${box} --cleanup`);
    return {box};
  }

  static async run(box: number, task: SandboxTask): Promise<SandboxTaskResult> {
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

    command += ' ' + task.command;

    try {
      await exec(command);
    } catch (err) {
      let metaStr = '';
      try {
        metaStr = (
          await fs.readFile(`/var/local/lib/isolate/${box}/meta.txt`)
        ).toString();
      } catch (_) {
        console.error('Meta file does not exist');
        return {
          status: SandboxStatus.SystemError,
          message: 'Meta file does not exist on abnormal termination',
        };
      }

      const result: any = await this.parseMeta(metaStr);

      switch (result['status']) {
        case 'XX':
          return {
            status: SandboxStatus.SystemError,
            message: result['message'] || 'Isolate threw system error',
          };
        case 'RE':
          return {
            status: SandboxStatus.RuntimeError,
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
              status: SandboxStatus.MemoryExceeded,
              message: 'Memory limit exceeded',
              memory: parseInt(result['memory']),
            };
          } else {
            return {
              status: SandboxStatus.RuntimeError,
              message: result['message'] || 'Program exit on signal',
            };
          }
        case 'TO':
          return {
            status: SandboxStatus.TimeExceeded,
            message: result['message'] || 'Isolate reported timeout',
            time: parseInt((parseFloat(result['time']) * 1000).toFixed()),
            wallTime: parseInt(
              (parseFloat(result['time-wall']) * 1000).toFixed()
            ),
          };
        default:
          return {
            status: SandboxStatus.SystemError,
            message: 'Unknown status on abnormal termination',
          };
      }
    }

    let metaStr = '';
    try {
      metaStr = (
        await fs.readFile(`/var/local/lib/isolate/${box}/meta.txt`)
      ).toString();
    } catch (_) {
      console.error('Meta file does not exist');
      return {
        status: SandboxStatus.SystemError,
        message: 'Meta file does not exist on successful termination',
      };
    }

    const result: any = await this.parseMeta(metaStr);
    return {
      status: SandboxStatus.Succeeded,
      time: parseInt((parseFloat(result['time']) * 1000).toFixed()),
      wallTime: parseInt((parseFloat(result['time-wall']) * 1000).toFixed()),
      memory: parseInt(result['memory']),
      message: 'Task completed successfully',
    };
  }
}

export {SandboxService};
