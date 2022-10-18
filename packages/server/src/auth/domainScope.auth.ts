import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyDomainScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    // @ts-expect-error: url of domain resources always includes domainId as a parameter.
    const domainId = request.params.domainId
    if (domainId == null || typeof domainId !== 'string') {
      reply.statusCode = 403
      return done(new Error('Resource not associated with a domain.'))
    }
    scopes.forEach((scope) => {
      if (!request.user.scopes[domainId].includes(scope)) {
        reply.statusCode = 403
        return done(new Error('You are not allowed to perform this action.'))
      }
    })

    return done()
  }
}
