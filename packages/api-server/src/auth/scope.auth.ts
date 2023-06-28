import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, InternalServerError, UnauthorizedError } from 'http-errors-enhanced'

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
      throw new ForbiddenError('User not logged in')
    }

    const { domainId } = request.params as { domainId: string | undefined }

    if (domainId == null || typeof domainId !== 'string') {
      throw new InternalServerError('Resource not associated with a domain')
    }

    const userScopes = request.auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        throw new ForbiddenError('Insufficient domain scope')
      }
    })
  }
}
