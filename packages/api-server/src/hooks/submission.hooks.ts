import { type FastifyRequest, type FastifyReply } from 'fastify'
import { InternalServerError } from 'http-errors-enhanced'
import { fetchSubmission } from '@argoncs/common'

export async function submissionAnnotateHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.params == null || typeof request.params !== 'object') {
    throw new InternalServerError('Resource not associated with a submission')
  }
  if (!('submissionId' in request.params)) {
    throw new InternalServerError('Resource not associated with a submission')
  }

  const { submissionId } = request.params
  if (submissionId == null || typeof submissionId !== 'string') {
    throw new InternalServerError('Resource not associated with a submission')
  }

  const submission = await fetchSubmission(submissionId)
  // @ts-expect-error property will be checked later
  request.params.contestId = submission.contestId
  // @ts-expect-error property will be checked later
  request.params.teamId = submission.teamId
  // @ts-expect-error property will be checked later
  request.params.domainId = submission.domainId
}
