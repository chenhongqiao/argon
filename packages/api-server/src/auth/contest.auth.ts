/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError, InternalServerError, NotFoundError } from 'http-errors-enhanced'
import { fetchContest } from '../services/contest.services.js'

export async function verifyContestPublished (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    return new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  if (!Boolean(contest.published)) {
    return new NotFoundError('Contest not found')
  }
}

export async function verifyContestBegan (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    return new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime()) {
    return new ForbiddenError('Contest has not started')
  }
}

export async function verifyContestRunning (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    return new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime() || now.getTime() > (new Date(contest.endTime)).getTime()) {
    return new ForbiddenError('Contest is not running')
  }
}
