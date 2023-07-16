import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestAuthProfile, requestParameter } from '../utils/auth.utils.js'

export async function verifyUserOwnership (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = requestAuthProfile(request)

  const userId = requestParameter(request, 'userId')

  if (userId !== auth.id) {
    throw new ForbiddenError('Resource not owned by user')
  }
}
