import {SandboxService} from './services/sandbox.service';
import {CompileService} from './services/compile.service';

import {SubmissionLang} from './configs/languages';

async function run() {
  /*console.log(
    await SandboxService.run(2, {
      constrains: {processes: 10, memory: 100000, wallTime: 1000},
      command: '/box/a.out',
      env: 'PATH=/bin:/usr/local/bin:/usr/bin',
      inputPath: '',
      outputPath: '',
    })
  );*/
  // await SandboxService.init(3);
  console.log(
    await CompileService.compile(
      {
        source: `#include<iostream> 
        using namespace std; 
        int main(){
          cout<<"hi"<<endl;
          return 0
        }`,
        constrains: {processes: 10},
        language: SubmissionLang.CPP,
        submissionID: 'test1',
      },
      3
    )
  );
}

run();
