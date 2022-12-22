import { FastifyPluginCallback } from 'fastify'

import { registerUser, initiateVerification, fetchUser, completeVerification, authenticateUser } from '../services/user.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'
import { AuthenticationError, AuthorizationError, ConflictError, NewUserSchema, NotFoundError }
  from '@argoncs/types'
import { delay } from '@argoncs/libraries'

import { randomInt } from 'node:crypto'

import { JWTPayload } from '../types'
import { Sentry } from '../connections/sentry.connections'

export const authenticationRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.post(
    '/register',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userId: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const user = request.body
      try {
        const registered = await registerUser(user)
        return await reply.status(201).send(registered)
      } catch (err) {
        if (err instanceof ConflictError) {
          reply.conflict(err.message)
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  publicRoutes.post(
    '/login',
    {
      schema: {
        body: Type.Object({ usernameOrEmail: Type.String(), password: Type.String() }),
        response: {
          200: Type.Object({ token: Type.String() }),
          403: Type.Object({
            message: Type.String(),
            userId: Type.String(),
            statusCode: Type.Number(),
            error: Type.String()
          })
        }
      }
    },
    async (request, reply) => {
      const { usernameOrEmail, password } = request.body
      try {
        const authenicated = await authenticateUser(usernameOrEmail, password)
        const { userId, scopes, role } = authenicated
        const payload: JWTPayload = { userId, scopes, role }
        const token = await reply.jwtSign(payload)
        await delay(randomInt(300, 600))
        return await reply.status(200).send({ token })
      } catch (err) {
        if (err instanceof AuthenticationError) {
          reply.unauthorized('Authentication failed.')
        } else if (err instanceof AuthorizationError) {
          await reply.status(403).send({ message: 'Please verify your email first.', userId: err.context.userId, statusCode: 403, error: 'Forbidden' })
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling user registration.')
        }
      }
    }
  )

  publicRoutes.get(
    '/initiate-verification/:userId',
    {
      schema: {
        params: Type.Object({ userId: Type.String() })
      }
    },
    async (request, reply) => {
      const { userId } = request.params
      try {
        const user = await fetchUser(userId)
        await initiateVerification(userId, user.email)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('User not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when initiating email verification.')
        }
      }
    }
  )

  publicRoutes.put(
    '/complete-verification/:userId',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        body: Type.Object({ token: Type.String() }),
        response: {
          200: Type.Object({ statusChanged: Type.Boolean() })
        }
      }
    },
    async (request, reply) => {
      const { token } = request.body
      const { userId } = request.params
      try {
        const { statusChanged } = await completeVerification(userId, token)
        return await reply.status(200).send({ statusChanged })
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('User to be verified not found.')
        } if (err instanceof AuthenticationError) {
          reply.unauthorized('Invalid verification.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when completing email verification.')
        }
      }
    }
  )

  return done()
}
