import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestUserProfile, requestParameter } from '../utils/auth.utils.js'

export async function ownsResource (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = requestUserProfile(request)

  const userId = requestParameter(request, 'userId')

  if (userId !== auth.id) {
    throw new ForbiddenError('Resource not owned by user')
  }
}
