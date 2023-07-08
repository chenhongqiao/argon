/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { FastifyRequest, FastifyReply } from 'fastify'
import { ForbiddenError, InternalServerError, NotFoundError } from 'http-errors-enhanced'
import { fetchContest } from '../services/contest.services.js'
import { userAuthHook } from '../hooks/authentication.hooks.js'

export async function verifyContestPublished (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of contest resources always includes contestId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  if (!Boolean(contest.published)) {
    throw new NotFoundError('Contest not found')
  }
}

export async function verifyContestRegistration (request: FastifyRequest, reply: FastifyReply) {
  if (request.auth == null) {
    await userAuthHook(request, reply)
    if (request.auth == null) {
      throw new ForbiddenError('User not logged in')
    }
  }

  // @ts-expect-error: url of contest resources always includes contestId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }

  if (request.auth.teams[contestId] == null || typeof request.auth.teams[contestId] !== 'string') {
    throw new ForbiddenError('Contest registration is required')
  }
}

export async function verifyContestBegan (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of contest resources always includes contestId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime()) {
    throw new ForbiddenError('Contest has not started')
  }
}

export async function verifyContestNotBegan (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of contest resources always includes contestId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() <= now.getTime()) {
    throw new ForbiddenError('Contest has began')
  }
}

export async function verifyContestRunning (request: FastifyRequest, reply: FastifyReply) {
  // @ts-expect-error: url of contest resources always includes contestId as a parameter.
  const contestId = request.params.contestId
  if (contestId == null || typeof contestId !== 'string') {
    throw new InternalServerError('Resource not associated with a contest')
  }
  const contest = await fetchContest(contestId)
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime() || now.getTime() > (new Date(contest.endTime)).getTime()) {
    throw new ForbiddenError('Contest is not running')
  }
}
