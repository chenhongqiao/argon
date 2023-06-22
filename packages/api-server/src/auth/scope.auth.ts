import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, UnauthorizedError } from 'http-errors-enhanced'

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
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (request.auth == null) {
      return done(new ForbiddenError('User not logged in'))
    }

    // @ts-expect-error: url of domain resources always includes domainId as a parameter.
    const domainId = request.params.domainId
    if (domainId == null || typeof domainId !== 'string') {
      return done(new ForbiddenError('Resource not associated with a domain'))
    }

    const userScopes = request.auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        return done(new ForbiddenError('Insufficient domain scope'))
      }
    })

    done()
  }
}
