import { JWTPayloadType } from '@argoncs/types'
import { FastifyRequest, FastifyReply } from 'fastify'
import { NotFoundError, UnauthorizedError } from 'http-errors-enhanced'
import { fetchAuthenticationProfile, fetchSession } from '../services/user.services.js'

export async function authJWTHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch (err) {
    throw new UnauthorizedError('JWT token verification failed.')
  }
  if (request.user.type !== JWTPayloadType.Identification) {
    throw new UnauthorizedError('JWT token must be valid for identification.')
  }

  try {
    const { userId } = await fetchSession(request.user.sessionId)
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
