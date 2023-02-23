import { JWTPayloadType } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyDomainScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (request.user.type !== JWTPayloadType.Identification) {
      reply.statusCode = 401
      return done(new Error('JWT token must be valid for identification.'))
    }

    // @ts-expect-error: url of domain resources always includes domainId as a parameter.
    const domainId = request.params.domainId
    if (domainId == null || typeof domainId !== 'string') {
      reply.statusCode = 403
      return done(new Error('Resource not associated with a domain.'))
    }

    scopes.forEach((scope) => {
      if (request.user.type !== JWTPayloadType.Identification || request.user.scopes[domainId] == null || !Boolean(request.user.scopes[domainId].includes(scope))) {
        reply.statusCode = 403
        return done(new Error('Insufficient domain scope.'))
      }
    })

    return done()
  }
}
