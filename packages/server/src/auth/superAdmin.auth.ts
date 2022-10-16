import { FastifyReply, FastifyRequest } from 'fastify'

export function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply, done): void {
  if (!request.user.superAdmin) {
    return done(new Error('You are not allowed to perform this action.'))
  }

  return done()
}
