import {exec} from '../utils/system.util';
import {promises as fs} from 'fs';
import {ErrorCode, UseCaseError} from '../../common/interfaces/error.interface';
import {
  SandboxTask,
  SandboxTaskResult,
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
  ): Promise<{workDir: string; box: number} | UseCaseError> {
    let workDir = '';
    try {
      workDir = (await exec(`isolate --box-id=${box} --cg --init`)).stdout;
    } catch (err: any) {
      if (err.message.startsWith('Box already exists')) {
        return {status: ErrorCode.Conflict};
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
      command += ' ' + `--wall-time=${(task.constrains.time / 1000.0) * 3}`;
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
        return {status: 'XX'};
      }
      const result: any = await this.parseMeta(metaStr);
      if (result['status'] === 'XX') {
        console.log(metaStr);
        return {status: 'XX'};
      } else if (
        result['status'] === 'RE' ||
        result['status'] === 'CG' ||
        result['status'] === 'TO'
      ) {
        const {status, message, time, memory} = result;
        console.log({status, message, time, memory});
        return {status, message, time, memory};
      } else {
        throw err;
      }
    }
    let metaStr = '';
    try {
      metaStr = (
        await fs.readFile(`/var/local/lib/isolate/${box}/meta.txt`)
      ).toString();
    } catch (_) {
      console.error('Meta file does not exist');
      return {status: 'XX'};
    }
    const result: any = await this.parseMeta(metaStr);
    const {time, memory} = result;
    console.log({status: 'OK', time, memory});
    return {status: 'OK', time, memory};
  }
}

export {SandboxService};
