import { deadResultsQueue, deadTasksQueue, judgerResultsQueue, rabbitMQ, sentry } from '@argoncs/common'
import { CompilingResultMessage, CompilingTask, GradingResultMessage, GradingTask, JudgerResultType } from '@argoncs/types'
import { completeGrading, handleCompileResult, handleGradingResult } from './services/result.services'

import { version } from '../package.json'

sentry.init({
  dsn: 'https://f56d872b49cc4981baf851fd569080cd@o1044666.ingest.sentry.io/450531102457856',
  environment: process.env.NODE_ENV,
  release: version
})

export async function startHandler (): Promise<void> {
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
