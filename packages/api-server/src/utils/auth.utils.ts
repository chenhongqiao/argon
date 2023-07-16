import { type AuthenticationProfile } from '@argoncs/types'
import { type FastifyRequest } from 'fastify'
import { InternalServerError, UnauthorizedError } from 'http-errors-enhanced'

export function requestParameter (request: FastifyRequest, key: string): string {
  if (request.params == null || typeof request.params !== 'object') {
    throw new InternalServerError('Unable to locate the required parameter')
  }
  if (!(key in request.params)) {
    throw new InternalServerError('Unable to locate the required parameter')
  }

  const value: string = request.params[key]
  if (value == null || typeof value !== 'string') {
    throw new InternalServerError('Unable to locate the required parameter')
  }
  return value
}

export function requestAuthProfile (request: FastifyRequest): AuthenticationProfile {
  if (request.auth == null) {
    throw new UnauthorizedError('User not logged in')
  }

  return request.auth
}
