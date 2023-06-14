import { FastifyRequest, FastifyReply } from 'fastify'
import { NotFoundError, UnauthorizedError } from 'http-errors-enhanced'
import { fetchAuthenticationProfile, fetchSession } from '../services/user.services.js'

export async function userAuthHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const cookie = request.cookies.session_token
  if (cookie == null) {
    throw new UnauthorizedError('Login is required to access this resource.')
  }
  const sessionId = request.unsignCookie(cookie)
  if (!sessionId.valid || sessionId.value == null) {
    throw new UnauthorizedError('Session ID is invalid.')
  }

  try {
    const { userId } = await fetchSession(sessionId.value)
    const authProfile = await fetchAuthenticationProfile(userId)
    request.auth = authProfile
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new UnauthorizedError('Session or user described by the token is invalid.')
    } else {
      throw err
    }
  }
}
