import { destroySandbox, initSandbox } from './services/sandbox.service'
import { gradeSubmission } from './services/grade.service'
import { compileSubmission } from './services/compile.service'

import { messageReceiver, GradingTask, CompilingTask, JudgerTaskType, delay } from '@project-carbon/shared'

import os = require('os')
import { randomUUID } from 'crypto'
import got from 'got'

const availableBoxes = new Set()
const judgerID = randomUUID()
const serverBaseURL = process.env.SERVER_BASE_URL ?? '127.0.0.1:3000'

async function handleGradingTask (task: GradingTask, boxID: number): Promise<void> {
  await initSandbox(boxID)
  const result = await gradeSubmission(task, boxID)
  await destroySandbox(boxID)
  availableBoxes.add(boxID)
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  await got.put(new URL(`/submissions/${task.submissionID}/gradingResult/${task.testcaseIndex}`, serverBaseURL).href, {
    json: result,
    timeout: {
      request: 20000
    }
  })
}

async function handleCompilingTask (task: CompilingTask, boxID: number): Promise<void> {
  await initSandbox(boxID)
  const result = await compileSubmission(task, boxID)
  await destroySandbox(boxID)
  availableBoxes.add(boxID)
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  await got.put(new URL(`/submissions/${task.submissionID}/compilingResult`, serverBaseURL).href, {
    json: result,
    timeout: {
      request: 20000
    }
  })
}

export async function startJudger (): Promise<void> {
  console.log(`Starting Judger ${judgerID}.`)

  const cores = os.cpus().length

  console.log(`${cores} CPU cores detected.`)

  const destroyQueue: Array<Promise<{ boxID: number }>> = []
  for (let id = 1; id <= cores; id += 1) {
    destroyQueue.push(destroySandbox(id))
    availableBoxes.add(id)
  }
  await Promise.all(destroyQueue)

  console.log('All sandboxes initialized.')

  console.log('Start receiving tasks.')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (availableBoxes.size > 0) {
      const messages = await messageReceiver.receiveMessages(availableBoxes.size)
      const tasks: Array<GradingTask | CompilingTask> = messages.map(
        message => message.body
      )
      console.log(tasks.length)
      tasks.forEach(task => {
        const boxID = availableBoxes.values().next().value
        availableBoxes.delete(boxID)
        if (task.type === JudgerTaskType.Grading) {
          void handleGradingTask(task, boxID)
        } else if (task.type === JudgerTaskType.Compiling) {
          void handleCompilingTask(task, boxID)
        }
      })
    } else {
      await delay(200)
    }
  }
}
