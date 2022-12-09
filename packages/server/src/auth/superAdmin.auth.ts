import { UserRole } from '@cocs/types'
import { FastifyReply, FastifyRequest } from 'fastify'

export function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.user.role !== UserRole.Admin) {
    reply.statusCode = 403
    return done(new Error('Insufficient user role.'))
  }

  return done()
}
