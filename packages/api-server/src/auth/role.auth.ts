import { UserRole } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, UnauthorizedError } from 'http-errors-enhanced'

export function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.auth == null) {
    return done(new UnauthorizedError('User not logged in'))
  }

  if (request.auth.role !== UserRole.Admin) {
    return done(new ForbiddenError('User needs admin privilege to perform this action'))
  }

  done()
}
