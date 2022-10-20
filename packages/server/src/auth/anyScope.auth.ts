import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyAnyScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    const allScopes = Object.values(request.user.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        reply.statusCode = 403
        return done(new Error('Insufficient user scope.'))
      }
    })

    return done()
  }
}
