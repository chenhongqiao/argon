import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyAnyScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (request.auth == null) {
      return done(new Error('User not logged in.'))
    }

    const allScopes = Object.values(request.auth.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        reply.statusCode = 403
        return done(new Error('Insufficient user scope.'))
      }
    })

    return done()
  }
}

export function verifyDomainScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (request.auth == null) {
      return done(new Error('User not logged in.'))
    }

    // @ts-expect-error: url of domain resources always includes domainId as a parameter.
    const domainId = request.params.domainId
    if (domainId == null || typeof domainId !== 'string') {
      reply.statusCode = 403
      return done(new Error('Resource not associated with a domain.'))
    }

    const userScopes = request.auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        reply.statusCode = 403
        return done(new Error('Insufficient domain scope.'))
      }
    })

    return done()
  }
}
