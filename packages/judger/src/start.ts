import { initSandbox, destroySandbox } from './services/sandbox.service'
import { judgeSubmission, JudgeTask } from './services/judge.service'
import { compileSubmission, CompileTask } from './services/compile.service'

import { ServiceBus } from '@project-carbon/common'

import os = require('os')

const sandboxes = new Set()

export enum GraderTaskType {
  Compile = 'Compile',
  Judge = 'Judge',
}

async function handleJudgeTask (task: JudgeTask, box: number): Promise<void> {
  await initSandbox(box)
  const result = await judgeSubmission(task, box)
  console.log(result)
  await destroySandbox(box)
  sandboxes.add(box)
}

async function handleCompileTask (task: CompileTask, box: number): Promise<void> {
  await initSandbox(box)
  const result = await compileSubmission(task, box)
  console.log(result)
  await destroySandbox(box)
  sandboxes.add(box)
}

export async function startJudger (): Promise<void> {
  const cores = os.cpus().length
  const destroyQueue: Array<Promise<{ box: number }>> = []
  for (let id = 1; id <= cores; id += 1) {
    destroyQueue.push(destroySandbox(id))
    sandboxes.add(id)
  }
  await Promise.all(destroyQueue)

  console.log('listening')
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const messages = await ServiceBus.receiver.receiveMessages(sandboxes.size)
    console.log('received some')
    const tasks: Array<JudgeTask | CompileTask> = messages.map(
      message => message.body
    )
    tasks.forEach(task => {
      const box = sandboxes.values().next().value
      sandboxes.delete(box)
      if (task.type === GraderTaskType.Judge) {
        void handleJudgeTask(task, box)
      } else if (task.type === GraderTaskType.Compile) {
        void handleCompileTask(task, box)
      }
    })
  }
}
