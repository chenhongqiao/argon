import { judgerResultsQueue, rabbitMQ } from '@argoncs/common'
import { CompilingResultMessage, GradingResultMessage, JudgerResultType } from '@argoncs/types'
import { handleCompileResult, handleGradingResult } from './services/result.services'

async function startHandler (): Promise<void> {
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
}
void startHandler()
