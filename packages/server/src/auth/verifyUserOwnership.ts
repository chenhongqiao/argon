import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyUserOwnsership (request: FastifyRequest, reply: FastifyReply, done): void {
  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const userId = request.params.userId
  if (userId == null || typeof userId !== 'string') {
    return done(new Error('Resource not associated with an user.'))
  }
  if (userId !== request.user.userId) {
    return done(new Error('You are not allowed to perform this action.'))
  }

  return done()
}
