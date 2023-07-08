import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, InternalServerError } from 'http-errors-enhanced'
import { userAuthHook } from '../hooks/authentication.hooks.js'

export async function verifyUserOwnership (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.auth == null) {
    await userAuthHook(request, reply)
    if (request.auth == null) {
      throw new ForbiddenError('User not logged in')
    }
  }

  // @ts-expect-error: url of domain resources always includes domainId as a parameter.
  const userId = request.params.userId
  if (userId == null || typeof userId !== 'string') {
    throw new InternalServerError('Resource not associated with an user')
  }
  if (userId !== request.auth.id) {
    throw new ForbiddenError('Resource not owned by user')
  }
}
