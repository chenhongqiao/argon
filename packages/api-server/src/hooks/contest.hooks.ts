import { type FastifyRequest, type FastifyReply } from 'fastify'
import { InternalServerError } from 'http-errors-enhanced'
import { fetchContest } from '../services/contest.services.js'

export async function contestAnnotateHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.params == null || typeof request.params !== 'object') {
    throw new InternalServerError('Resource not associated with a submission')
  }
  if (!('contestId' in request.params)) {
    throw new InternalServerError('Resource not associated with a submission')
  }

  const { contestId } = request.params
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }

  const contest = await fetchContest(contestId)
  // @ts-expect-error property will be checked later
  request.params.domainId = contest.domainId
}
