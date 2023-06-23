import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, InternalServerError, UnauthorizedError } from 'http-errors-enhanced'

export function verifyUserOwnership (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.auth == null) {
    return done(new UnauthorizedError('User not logged in'))
  }

  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const userId = request.params.userId
  if (userId == null || typeof userId !== 'string') {
    return done(new InternalServerError('Resource not associated with an user'))
  }
  if (userId !== request.auth.id) {
    return done(new ForbiddenError('Resource not owned by user'))
  }

  done()
}
