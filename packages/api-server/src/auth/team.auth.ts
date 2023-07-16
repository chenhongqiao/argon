/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { fetchTeam } from '../services/team.services.js'
import { requestAuthProfile, requestParameter } from '../utils/auth.utils.js'

export async function isTeamMember (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = requestAuthProfile(request)
  const contestId = requestParameter(request, 'contestId')
  const teamId = requestParameter(request, 'teamId')

  if (auth.teams[contestId] == null || auth.teams[contestId] !== teamId) {
    throw new ForbiddenError('User is not a member of this team')
  }
}

export async function isTeamCaptain (request: FastifyRequest, reply: FastifyReply) {
  const auth = requestAuthProfile(request)
  const contestId = requestParameter(request, 'contestId')
  const teamId = requestParameter(request, 'teamId')

  const team = await fetchTeam(teamId, contestId)
  if (team.captain !== auth.id) {
    throw new ForbiddenError('User needs to be the captain to perform this action')
  }
}
