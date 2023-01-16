import { JWTPayloadType, UserRole } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'

export function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.user.type !== JWTPayloadType.Identification) {
    reply.statusCode = 401
    return done(new Error('JWT token must be valid for identification.'))
  }

  if (request.user.role !== UserRole.Admin) {
    reply.statusCode = 403
    return done(new Error('Insufficient user role.'))
  }

  return done()
}
