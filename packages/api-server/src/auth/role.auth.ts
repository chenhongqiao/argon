import { UserRole } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'

export function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.auth == null) {
    return done(new Error('User not logged in.'))
  }

  if (request.auth.role !== UserRole.Admin) {
    reply.statusCode = 403
    return done(new Error('Insufficient user role privilege (needs to be admin).'))
  }

  return done()
}
