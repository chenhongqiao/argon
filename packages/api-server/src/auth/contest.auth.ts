/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type FastifyRequest, type FastifyReply } from 'fastify'
import { ForbiddenError, NotFoundError } from 'http-errors-enhanced'
import { fetchContestById } from '../services/contest.services.js'
import { requestAuthProfile, requestParameter } from '../utils/auth.utils.js'

export async function contestPublished (request: FastifyRequest, reply: FastifyReply) {
  const contestId = requestParameter(request, 'contestId')

  const contest = await fetchContestById({ contestId })
  if (!Boolean(contest.published)) {
    throw new NotFoundError('Contest not found')
  }
}

export async function registeredForContest (request: FastifyRequest, reply: FastifyReply) {
  const auth = requestAuthProfile(request)

  const contestId = requestParameter(request, 'contestId')

  if (auth.teams[contestId] == null || typeof auth.teams[contestId] !== 'string') {
    throw new ForbiddenError('Contest registration is required')
  }
}

export async function contestBegan (request: FastifyRequest, reply: FastifyReply) {
  const contestId = requestParameter(request, 'contestId')

  const contest = await fetchContestById({ contestId })
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime()) {
    throw new ForbiddenError('Contest has not started')
  }
}

export async function contestNotBegan (request: FastifyRequest, reply: FastifyReply) {
  const contestId = requestParameter(request, 'contestId')

  const contest = await fetchContestById({ contestId })
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() <= now.getTime()) {
    throw new ForbiddenError('Contest has began')
  }
}

export async function contestRunning (request: FastifyRequest, reply: FastifyReply) {
  const contestId = requestParameter(request, 'contestId')

  const contest = await fetchContestById({ contestId })
  const now = new Date()
  if ((new Date(contest.startTime)).getTime() > now.getTime() || now.getTime() > (new Date(contest.endTime)).getTime()) {
    throw new ForbiddenError('Contest is not running')
  }
}
