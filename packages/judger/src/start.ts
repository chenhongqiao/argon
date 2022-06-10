import { initSandbox, destroySandbox } from './services/sandbox.service';
import { judgeSubmission } from './services/judge.service';
import { compileSubmission } from './services/compile.service';

import { JudgeTask } from './services/judge.service';
import { CompileTask } from './services/compile.service'


import { ServiceBusClient } from '@azure/service-bus';

import os = require('os');

const sandboxes = new Set();

export enum GraderTaskType {
  Compile = 'Compile',
  Judge = 'Judge',
}

async function handleJudgeTask(task: JudgeTask, box: number) {
  await initSandbox(box);
  const result = await judgeSubmission(task, box);
  console.log(result);
  await destroySandbox(box);
  sandboxes.add(box);
}

async function handleCompileTask(task: CompileTask, box: number) {
  await initSandbox(box);
  const result = await compileSubmission(task, box);
  console.log(result);
  await destroySandbox(box);
  sandboxes.add(box);
}

export async function startJudger() {
  const cores = os.cpus().length;
  const destroyQueue = [];
  for (let id = 1; id <= cores; id += 1) {
    destroyQueue.push(destroySandbox(id));
    sandboxes.add(id);
  }
  await Promise.all(destroyQueue);
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
    const tasks: Array<JudgeTask | CompileTask> = messages.map(
      message => message.body
    );
    tasks.forEach(task => {
      const box = sandboxes.values().next().value;
      sandboxes.delete(box);
      if (task.type === GraderTaskType.Judge) {
        handleJudgeTask(task, box);
      } else if (task.type === GraderTaskType.Compile) {
        handleCompileTask(task, box);
      }
    });
  }
}
