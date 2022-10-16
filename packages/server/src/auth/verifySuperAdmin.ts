import { FastifyReply, FastifyRequest } from 'fastify'

export default function verifySuperAdmin () {
  return function handler (request: FastifyRequest, reply: FastifyReply, done) {
    if (!request.user.superAdmin) {
      return done(new Error('You are not allowed to perform this action.'))
    }

    return done()
  }
}
