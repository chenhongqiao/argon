import * as SandboxService from './services/sandbox.service';
import * as CompileService from './services/compile.service';
import * as JudgeService from './services/judge.service';

import {ServiceBusClient} from '@azure/service-bus';

import os = require('os');

const sandboxes = new Set();

export enum TaskType {
  Compile = 'Compile',
  Judge = 'Judge',
}

async function handleJudgeTask(task: JudgeService.Task, box: number) {
  await SandboxService.init(box);
  const result = await JudgeService.judge(task, box);
  console.log(result);
  await SandboxService.destroy(box);
  sandboxes.add(box);
}

async function handleCompileTask(task: CompileService.Task, box: number) {
  await SandboxService.init(box);
  const result = await CompileService.compile(task, box);
  console.log(result);
  await SandboxService.destroy(box);
  sandboxes.add(box);
}

async function start() {
  const cores = os.cpus().length;
  for (let id = 1; id <= cores; id += 1) {
    SandboxService.destroy(1);
    sandboxes.add(id);
  }
  const messageClient = new ServiceBusClient(
    'Endpoint=sb://carbondev.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=hX1nsR8WuiqrQEC2q2a/ce3PBMiT7MmvJ2AS02XQOc0='
  );
  const receiver = messageClient.createReceiver('tasks', {
    receiveMode: 'receiveAndDelete',
  });
  console.log('listening');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const messages = await receiver.receiveMessages(sandboxes.size);
    console.log('received some');
    const tasks: Array<JudgeService.Task | CompileService.Task> = messages.map(
      message => message.body
    );
    tasks.forEach(task => {
      const box = sandboxes.values().next().value;
      sandboxes.delete(box);
      if (task.type === TaskType.Judge) {
        handleJudgeTask(task, box);
      } else if (task.type === TaskType.Compile) {
        handleCompileTask(task, box);
      }
    });
  }
}

start();
