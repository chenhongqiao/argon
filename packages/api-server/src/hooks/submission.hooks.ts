import { FastifyRequest, FastifyReply } from 'fastify'
import { InternalServerError } from 'http-errors-enhanced'
import { fetchSubmission } from '@argoncs/common'

export async function submissionAnnotateHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { submissionId } = request.params as { submissionId: string | undefined }
  if (submissionId == null) {
    throw new InternalServerError('Resource not associated with a submission')
  }

  const submission = await fetchSubmission(submissionId)
  // @ts-expect-error
  request.params.contestId = submission.contestId
  // @ts-expect-error
  request.params.teamId = submission.teamId
  // @ts-expect-error
  request.params.domainId = submission.domainId
}
