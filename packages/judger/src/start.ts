import { destroySandbox, initSandbox } from './services/sandbox.services'
import { gradeSubmission } from './services/grading.services'
import { compileSubmission } from './services/compile.services'

import { GradingTask, CompilingTask, JudgerTaskType } from '@argoncs/types'
import { rabbitMQ, judgerTasksQueue } from '@argoncs/common'

import os = require('node:os')
import { randomUUID } from 'node:crypto'
import got from 'got'
import { pino } from 'pino'
import Sentry = require('@sentry/node')

import { version } from '../package.json'

const logger = pino()

const availableBoxes = new Set()
const judgerId = randomUUID()
const serverBaseURL = process.env.SERVER_BASE_URL ?? 'http://127.0.0.1:8000'

Sentry.init({
  dsn: 'https://54ac76947d434e9a981b7e85191910cc@o1044666.ingest.sentry.io/65541781',
  environment: process.env.NODE_ENV,
  release: version
})

async function handleGradingTask (task: GradingTask, boxId: number): Promise<void> {
  await initSandbox(boxId)
  const result = await gradeSubmission(task, boxId)
  await destroySandbox(boxId)
  availableBoxes.add(boxId)
  try {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await got.put(new URL(`/submission-results/${task.submissionId}/testcase-result/${task.testcaseIndex}`, serverBaseURL).href, {
      json: result,
      headers: {
        Authorization: `Bearer ${process.env.JUDGER_TOKEN ?? ''}`
      },
      timeout: {
        request: 30000
      }
    })
    logger.info(task, 'Task completed.')
  } catch (err) {
    logger.error(err)
  }
}

async function handleCompilingTask (task: CompilingTask, boxId: number): Promise<void> {
  await initSandbox(boxId)
  const result = await compileSubmission(task, boxId)
  await destroySandbox(boxId)
  try {
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    await got.put(new URL(`/submission-results/${task.submissionId}/compiling-result`, serverBaseURL).href, {
      json: result,
      headers: {
        Authorization: `Bearer ${process.env.JUDGER_TOKEN ?? ''}`
      },
      timeout: {
        request: 30000
      }
    })
    logger.info(task, 'Task completed.')
  } catch (err) {
    logger.error(err)
  }
}

export async function startJudger (): Promise<void> {
  const cores = os.cpus().length

  logger.info(`${cores} CPU cores detected.`)

  const destroyQueue: Array<Promise<{ boxId: number }>> = []
  for (let id = 1; id <= cores; id += 1) {
    destroyQueue.push(destroySandbox(id))
    availableBoxes.add(id)
  }
  await Promise.all(destroyQueue)

  logger.info(`Judger ${judgerId} start receiving tasks.`)

  await rabbitMQ.prefetch(availableBoxes.size)
  await rabbitMQ.consume(judgerTasksQueue, async (message) => {
    if (message != null) {
      const boxId = availableBoxes.values().next().value
      try {
        if (availableBoxes.size === 0) {
          rabbitMQ.reject(message, true)
          return
        }
        const task = JSON.parse(message.content.toString()) as GradingTask | CompilingTask
        logger.info(task, 'New task received.')
        availableBoxes.delete(boxId)
        if (task.type === JudgerTaskType.Grading) {
          await handleGradingTask(task, boxId)
        } else if (task.type === JudgerTaskType.Compiling) {
          await handleCompilingTask(task, boxId)
        }
      } catch (err) {
        Sentry.captureException(err)
        rabbitMQ.reject(message, false)
      } finally {
        availableBoxes.add(boxId)
      }
    }
  })
}
