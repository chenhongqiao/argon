import { destroySandbox, initSandbox } from './services/sandbox.service'
import { gradeSubmission } from './services/grade.service'
import { compileSubmission } from './services/compile.service'

import { messageReceiver, GradingTask, CompilingTask, JudgerTaskType } from '@project-carbon/shared'

import * as os from 'os'
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

  messageReceiver.subscribe({
    processMessage: async (message): Promise<void> => {
      const task = message.body
      const boxID = availableBoxes.values().next().value
      availableBoxes.delete(boxID)
      if (task.type === JudgerTaskType.Grading) {
        await handleGradingTask(task, boxID)
      } else if (task.type === JudgerTaskType.Compiling) {
        await handleCompilingTask(task, boxID)
      }
    },
    processError: async (error): Promise<void> => {
      console.error(error)
    }
  })

  console.log('Subscribed to Service Bus. Receiving tasks.')
}
