import { FastifyReply, FastifyRequest } from 'fastify'

export default function verifyAnyScope (scopes: string[]) {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    const allScopes = Object.values(request.user.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        return done(new Error('You are not allowed to perform this action.'))
      }
    })

    return done()
  }
}
