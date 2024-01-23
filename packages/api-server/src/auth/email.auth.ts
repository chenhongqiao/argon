import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestUserProfile } from '../utils/auth.utils.js'

export async function hasVerifiedEmail (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = requestUserProfile(request)

  if (auth.email == null) {
    throw new ForbiddenError('A verified email is requried')
  }
}
