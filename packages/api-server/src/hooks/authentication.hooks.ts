import { type FastifyRequest, type FastifyReply } from 'fastify'
import { NotFoundError, UnauthorizedError } from 'http-errors-enhanced'
import { fetchAuthenticationProfile, fetchSession } from '../services/user.services.js'
import { requestAuthProfile } from '../utils/auth.utils.js'

export async function userAuthHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    requestAuthProfile(request)
  } catch {
    const cookie = request.cookies.session_token
    if (cookie == null) {
      throw new UnauthorizedError('User not logged in')
    }
    const sessionToken = request.unsignCookie(cookie)
    if (!sessionToken.valid || sessionToken.value == null) {
      throw new UnauthorizedError('Session ID is invalid')
    }

    try {
      const { userId } = await fetchSession({ sessionToken: sessionToken.value })
      const authProfile = await fetchAuthenticationProfile({ userId })
      request.auth = authProfile
    } catch (err) {
      if (err instanceof NotFoundError) {
        throw new UnauthorizedError('Session or user described by the token is invalid')
      } else {
        throw err
      }
    }
  }
}
