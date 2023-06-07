import { connectMongoDB, connectRabbitMQ, deadResultsQueue, deadTasksQueue, judgerResultsQueue, rabbitMQ, sentry } from '@argoncs/common'
import { CompilingResultMessage, CompilingTask, GradingResultMessage, GradingTask, JudgerResultType } from '@argoncs/types'
import assert from 'assert'
import { completeGrading, handleCompileResult, handleGradingResult } from './services/result.services.js'

sentry.init({
  dsn: 'https://f56d872b49cc4981baf851fd569080cd@o1044666.ingest.sentry.io/450531102457856',
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version
})

export async function startHandler (): Promise<void> {
  assert(process.env.RABBITMQ_URL != null)
  await connectRabbitMQ(process.env.RABBITMQ_URL)
  assert(process.env.MONGO_URL != null)
  await connectMongoDB(process.env.MONGO_URL)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(judgerResultsQueue, async (message) => {
    if (message != null) {
      try {
        const resultMessage: CompilingResultMessage | GradingResultMessage = JSON.parse(message.content.toString())

        if (resultMessage.type === JudgerResultType.Compiling) {
          await handleCompileResult(resultMessage.result, resultMessage.submissionId)
        } else if (resultMessage.type === JudgerResultType.Grading) {
          await handleGradingResult(resultMessage.result, resultMessage.submissionId, resultMessage.testcaseIndex)
        } else {
          throw Error('Invalid result type.')
        }

        rabbitMQ.ack(message)
      } catch (err) {
        sentry.captureException(err)
        rabbitMQ.reject(message, false)
      }
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(deadResultsQueue, async (message) => {
    if (message != null) {
      try {
        const letter: CompilingResultMessage | GradingResultMessage = JSON.parse(message.content.toString())

        await completeGrading(letter.submissionId, 'One or more of the grading results failed to be processed.')
        rabbitMQ.ack(message)
      } catch (err) {
        sentry.captureException(err)
        rabbitMQ.reject(message, false)
      }
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(deadTasksQueue, async (message) => {
    if (message != null) {
      try {
        const letter: CompilingTask | GradingTask = JSON.parse(message.content.toString())
        await completeGrading(letter.submissionId, 'One or more of the grading tasks failed to complete.')
        rabbitMQ.ack(message)
      } catch (err) {
        sentry.captureException(err)
        rabbitMQ.reject(message, false)
      }
    }
  })
}
