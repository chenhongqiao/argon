import { destroySandbox, initSandbox } from './services/sandbox.services'
import { gradeSubmission } from './services/grade.services'
import { compileSubmission } from './services/compile.services'

import { messageReceiver, GradingTask, CompilingTask, JudgerTaskType, delay } from '@cocs/common'

import os = require('node:os')
import { randomUUID } from 'node:crypto'
import got from 'got'
import { pino } from 'pino'
import Sentry = require('@sentry/node')

import { version } from '../package.json'

const logger = pino()

const availableBoxes = new Set()
const judgerID = randomUUID()
const serverBaseURL = process.env.SERVER_BASE_URL ?? 'http://127.0.0.1:8000'

Sentry.init({
  dsn: 'https://54ac76947d434e9a981b7e85191910cc@o1044666.ingest.sentry.io/65541781',
  environment: process.env.NODE_ENV,
  release: version
})

async function handleGradingTask (task: GradingTask, boxID: number): Promise<void> {
  await initSandbox(boxID)
  const result = await gradeSubmission(task, boxID)
  await destroySandbox(boxID)
  availableBoxes.add(boxID)
  try {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await got.put(new URL(`/submissions/${task.submissionID}/testcase-result/${task.testcaseIndex}`, serverBaseURL).href, {
      json: result,
      timeout: {
        request: 30000
      }
    })
  } catch (err) {
    logger.error(err)
  }
}

async function handleCompilingTask (task: CompilingTask, boxID: number): Promise<void> {
  await initSandbox(boxID)
  const result = await compileSubmission(task, boxID)
  await destroySandbox(boxID)
  availableBoxes.add(boxID)
  try {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await got.put(new URL(`/submissions/${task.submissionID}/compiling-result`, serverBaseURL).href, {
      json: result,
      timeout: {
        request: 30000
      }
    })
  } catch (err) {
    logger.error(err)
  }
}

export async function startJudger (): Promise<void> {
  const cores = os.cpus().length

  logger.info(`${cores} CPU cores detected.`)

  const destroyQueue: Array<Promise<{ boxID: number }>> = []
  for (let id = 1; id <= cores; id += 1) {
    destroyQueue.push(destroySandbox(id))
    availableBoxes.add(id)
  }
  await Promise.all(destroyQueue)

  logger.info(`Judger ${judgerID} start receiving tasks.`)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (availableBoxes.size > 0) {
      const messages = await messageReceiver.receiveMessages(availableBoxes.size, { maxWaitTimeInMs: 200 })
      const tasks: Array<GradingTask | CompilingTask> = messages.map(
        message => message.body
      )
      tasks.forEach(task => {
        const boxID = availableBoxes.values().next().value
        availableBoxes.delete(boxID)
        if (task.type === JudgerTaskType.Grading) {
          try {
            void handleGradingTask(task, boxID)
          } catch (err) {
            Sentry.captureException(err)
            logger.error(err)
          }
        } else if (task.type === JudgerTaskType.Compiling) {
          try {
            void handleCompilingTask(task, boxID)
          } catch (err) {
            Sentry.captureException(err)
            logger.error(err)
          }
        }
      })
    } else {
      await delay(200)
    }
  }
}
