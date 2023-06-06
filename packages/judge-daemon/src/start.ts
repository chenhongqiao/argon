import { destroySandbox, initSandbox } from './services/sandbox.services'
import { gradeSubmission } from './services/grading.services'
import { compileSubmission } from './services/compile.services'

import { GradingTask, CompilingTask, JudgerTaskType, GradingResultMessage, JudgerResultType, CompilingResultMessage } from '@argoncs/types'
import { rabbitMQ, judgerTasksQueue, judgerExchange, judgerResultsKey } from '@argoncs/common'

import os = require('node:os')
import { randomUUID } from 'node:crypto'
import { pino } from 'pino'
import Sentry = require('@sentry/node')

import { version } from '../package.json'

const logger = pino()

const availableBoxes = new Set()
const judgerId = randomUUID()

Sentry.init({
  dsn: 'https://54ac76947d434e9a981b7e85191910cc@o1044666.ingest.sentry.io/65541781',
  environment: process.env.NODE_ENV,
  release: version
})

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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(judgerTasksQueue, async (message) => {
    if (message != null) {
      const boxId = availableBoxes.values().next().value
      try {
        if (availableBoxes.size === 0) {
          rabbitMQ.reject(message, true)
          logger.info('Received a task when no box is available.')
          return
        }
        const task: GradingTask | CompilingTask = JSON.parse(message.content.toString())

        logger.info(task, 'Processing a new task.')
        availableBoxes.delete(boxId)
        await initSandbox(boxId)

        let result: CompilingResultMessage | GradingResultMessage

        if (task.type === JudgerTaskType.Grading) {
          result = {
            type: JudgerResultType.Grading,
            result: (await gradeSubmission(task, boxId)),
            submissionId: task.submissionId,
            testcaseIndex: task.testcaseIndex
          }
        } else if (task.type === JudgerTaskType.Compiling) {
          result = {
            type: JudgerResultType.Compiling,
            result: (await compileSubmission(task, boxId)),
            submissionId: task.submissionId
          }
        } else {
          throw Error('Invalid task type.')
        }

        rabbitMQ.publish(judgerExchange, judgerResultsKey, Buffer.from(JSON.stringify(result)))
        rabbitMQ.ack(message)
      } catch (err) {
        Sentry.captureException(err)
        rabbitMQ.reject(message, false)
      } finally {
        await destroySandbox(boxId)
        availableBoxes.add(boxId)
      }
    }
  })
}
