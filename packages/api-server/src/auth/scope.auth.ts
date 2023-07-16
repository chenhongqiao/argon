import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestAuthProfile, requestParameter } from '../utils/auth.utils.js'

export function hasDomainPrivilege (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    const auth = requestAuthProfile(request)

    const domainId = requestParameter(request, 'domainId')
    const userScopes = auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        throw new ForbiddenError('Insufficient domain privilege')
      }
    })
  }
}

export function hasContestPrivilege (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    const auth = requestAuthProfile(request)

    const domainId = requestParameter(request, 'domainId')
    const contestId = requestParameter(request, 'contestId')
    const userScopes = auth.scopes

    scopes.forEach((scope) => {
      const contestScope = `contest-${contestId}.${scope}`
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(contestScope))) {
        throw new ForbiddenError('Insufficient contest privilege')
      }
    })
  }
}

export function hasNoPrivilege (request: FastifyRequest, reply: FastifyReply): void {
  const auth = requestAuthProfile(request)

  const domainId = requestParameter(request, 'domainId')
  if (domainId in auth.scopes) {
    throw new ForbiddenError('User must not be a privileged member of this domain')
  }
}
