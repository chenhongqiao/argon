import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, InternalServerError, UnauthorizedError } from 'http-errors-enhanced'
import { fetchContest } from '../services/contest.services.js'

export function verifyAnyScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (request.auth == null) {
      return done(new UnauthorizedError('User not logged in'))
    }

    const allScopes = Object.values(request.auth.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        return done(new ForbiddenError('Insufficient user scope'))
      }
    })

    done()
  }
}

export function verifyDomainScope (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    if (request.auth == null) {
      return new ForbiddenError('User not logged in')
    }

    let { domainId } = request.params as { domainId: string | undefined }
    const { contestId } = request.params as { contestId: string | undefined }

    if (domainId == null || typeof domainId !== 'string') {
      if (contestId != null && typeof contestId === 'string') {
        const contest = await fetchContest(contestId)
        domainId = contest.domainId
      } else {
        return new InternalServerError('Resource not associated with a domain')
      }
    }

    const userScopes = request.auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId as string] == null || !Boolean(userScopes[domainId as string].includes(scope))) {
        return new ForbiddenError('Insufficient domain scope')
      }
    })
  }
}
