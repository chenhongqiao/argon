import {SandboxService} from './services/sandbox.service';
import {CompileService} from './services/compile.service';

async function run() {
  console.log(
    await SandboxService.run(2, {
      constrains: {processes: 10, memory: 100000, wallTime: 1000},
      command: '/box/a.out',
      env: 'PATH=/bin:/usr/local/bin:/usr/bin',
      inputPath: '',
      outputPath: '',
    })
  );
}

run();
