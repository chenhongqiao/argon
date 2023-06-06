import { deadResultsQueue, deadTasksQueue, judgerResultsQueue, rabbitMQ } from '@argoncs/common'
import { CompilingResultMessage, CompilingTask, GradingResultMessage, GradingTask, JudgerResultType } from '@argoncs/types'
import { completeGrading, handleCompileResult, handleGradingResult } from './services/result.services'

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
        rabbitMQ.reject(message, false)
      }
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(deadResultsQueue, async (message) => {
    if (message != null) {
      const letter: CompilingResultMessage | GradingResultMessage = JSON.parse(message.content.toString())

      await completeGrading(letter.submissionId, 'One or more of the grading results failed to be processed.')
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  await rabbitMQ.consume(deadTasksQueue, async (message) => {
    if (message != null) {
      const letter: CompilingTask | GradingTask = JSON.parse(message.content.toString())

      await completeGrading(letter.submissionId, 'One or more of the grading tasks failed to complete.')
    }
  })
}
