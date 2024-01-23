import { type FastifyRequest, type FastifyReply } from 'fastify'
import { NotFoundError, UnauthorizedError } from 'http-errors-enhanced'
import { fetchSessionByToken } from '../services/session.services.js'
import { fetchUser } from '../services/user.services.js'
import { requestUserProfile, requestSessionToken } from '../utils/auth.utils.js'

export async function userAuthHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    requestUserProfile(request)
  } catch {
    const { token } = requestSessionToken(request)

    try {
      const { userId } = await fetchSessionByToken({ sessionToken: token })
      const user = await fetchUser({ userId })
      request.user = user
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new UnauthorizedError('Session or user described by the token is invalid')
      } else {
        throw err
      }
    }
  }
}
