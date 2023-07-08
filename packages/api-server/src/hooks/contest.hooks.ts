import { FastifyRequest, FastifyReply } from 'fastify'
import { InternalServerError } from 'http-errors-enhanced'
import { fetchContest } from '../services/contest.services.js'

export async function contestAnnotateHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { contestId } = request.params as { contestId: string | undefined }
  if (contestId == null) {
    throw new InternalServerError('Resource not associated with a contest')
  }

  const contest = await fetchContest(contestId)
  // @ts-expect-error
  request.params.domainId = contest.domainId
}
