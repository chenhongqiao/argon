import { destroySandbox, initSandbox } from './services/sandbox.service'
import { judgeSubmission } from './services/grade.service'
import { compileSubmission } from './services/compile.service'

import { messageReceiver, GradeTask, CompileTask, JudgerTaskType } from '@project-carbon/shared'
import os = require('os')

const sandboxes = new Set()

async function handleGradeTask (task: GradeTask, box: number): Promise<void> {
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const messages = await messageReceiver.receiveMessages(sandboxes.size)
    const tasks: Array<GradeTask | CompileTask> = messages.map(
      message => message.body
    )
    tasks.forEach(task => {
      const box = sandboxes.values().next().value
      sandboxes.delete(box)
      if (task.type === JudgerTaskType.Grade) {
        void handleGradeTask(task, box)
      } else if (task.type === JudgerTaskType.Compile) {
        void handleCompileTask(task, box)
      }
    })
  }
}
