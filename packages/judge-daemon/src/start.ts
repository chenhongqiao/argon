import { destroySandbox, initSandbox } from './services/sandbox.services.js'
import { gradeSubmission } from './services/grading.services.js'
import { compileSubmission } from './services/compile.services.js'

import { GradingTask, CompilingTask, JudgerTaskType, GradingResultMessage, JudgerResultType, CompilingResultMessage } from '@argoncs/types'
import { rabbitMQ, judgerTasksQueue, judgerExchange, judgerResultsKey, sentry, connectRabbitMQ, connectMinIO } from '@argoncs/common'

import os = require('node:os')
import { randomUUID } from 'node:crypto'
import { pino } from 'pino'
import assert from 'assert'
import { prepareStorage } from './services/storage.services.js'

const logger = pino()

const availableBoxes = new Set()
const judgerId = randomUUID()

sentry.init({
  dsn: 'https://e30481557cee442a91f73c1bcc25b714@o1044666.ingest.sentry.io/4505311016910848',
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version
})

export async function startJudger (): Promise<void> {
  assert(process.env.RABBITMQ_URL != null)
  await connectRabbitMQ(process.env.RABBITMQ_URL)
  assert(process.env.MINIO_URL != null)
  await connectMinIO(process.env.MINIO_URL)

  await prepareStorage('/argon-cache')

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
      if (boxId == null) {
        rabbitMQ.reject(message, true)
        logger.info('Received a task when no box is available.')
        return
      }
      try {
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

        await destroySandbox(boxId)
        availableBoxes.add(boxId)

        rabbitMQ.ack(message)
      } catch (err) {
        sentry.captureException(err)

        await destroySandbox(boxId)
        availableBoxes.add(boxId)

        rabbitMQ.reject(message, false)
      }
    }
  })
}
