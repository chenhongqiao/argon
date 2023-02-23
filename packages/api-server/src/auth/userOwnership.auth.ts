import { FastifyReply, FastifyRequest } from 'fastify'

export function verifyUserOwnsership (request: FastifyRequest, reply: FastifyReply, done): void {
  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const userId = request.params.userId
  if (userId == null || typeof userId !== 'string') {
    reply.statusCode = 403
    return done(new Error('Resource not associated with an user.'))
  }
  if (userId !== request.user.userId) {
    reply.statusCode = 403
    return done(new Error('Resource not owned by user.'))
  }

  return done()
}
