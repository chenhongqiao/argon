import {exec} from '../utils/system.util';
import {ErrorCode, UseCaseError} from '../../common/interfaces/error.interface';
import {
  Constraints,
  ExecResult,
} from '../../common/interfaces/judger/sandbox.interface';

class SandboxUseCase {
  static async init(
    box: number
  ): Promise<{workDir: string; box: number} | UseCaseError> {
    let workDir = '';
    try {
      workDir = (await exec(`isolate -b ${box} --init`)).stdout;
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
    await exec(`isolate -b ${box} --cleanup`);
    return {box};
  }

  static async run(box: number, constrains: Constraints, program: string) {
    const command = `isolate --run --cg --box-id=${box}`;
    if (constrains.memory) {
      command.concat(' ', '--cg-mem=', constrains.memory.toString());
    }
    if (constrains.time) {
      command.concat(' ', '--time=', (constrains.time / 1000.0).toString());
      command.concat(
        ' ',
        '--wall-time=',
        ((constrains.time / 1000.0) * 3).toString()
      );
    }
    if (constrains.totalStorage) {
      command.concat(' ', '--fsize=', constrains.totalStorage.toString());
    }
    if (constrains.processes) {
      command.concat(' ', '--processes=', constrains.processes.toString());
    }
    command.concat(' ', program);
    await exec(command);
    return;
  }
}

export {SandboxUseCase};
