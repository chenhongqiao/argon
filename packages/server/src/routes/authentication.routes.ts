import { FastifyPluginCallback } from 'fastify'

import { registerUser, initiateVerification, fetchUser, completeVerification, authenticateUser } from '../services/user.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'
import { AuthenticationError, AuthorizationError, ConflictError, delay, NewUserSchema, NotFoundError } from '@project-carbon/shared'

import { randomInt } from 'node:crypto'

import { JWTPayload } from '../types'

export const authenticationRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.post(
    '/register',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userId: Type.String() }),
          409: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const user = request.body
      const registered = await registerUser(user).catch(async (err) => {
        if (err instanceof ConflictError) {
          return await reply.status(409).send({ message: err.message })
        } else {
          throw err
        }
      })
      return await reply.status(201).send(registered)
    }
  )

  publicRoutes.post(
    '/login',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        body: Type.Object({ usernameOrEmail: Type.String(), password: Type.String() }),
        response: {
          200: Type.Object({ token: Type.String() }),
          401: Type.Object({ message: Type.String() }),
          403: Type.Object({ message: Type.String(), userId: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { usernameOrEmail, password } = request.body
      const authenicated = await authenticateUser(usernameOrEmail, password).catch(async (err) => {
        if (err instanceof AuthenticationError) {
          return await reply.status(401).send({ message: 'Login failed.' })
        } else if (err instanceof AuthorizationError) {
          return await reply.status(403).send({ message: 'Please verify your email first.', userId: err.resource })
        } else {
          throw err
        }
      })
      const payload: JWTPayload = { userId: authenicated.userId, scopes: authenicated.scopes }
      const token = await reply.jwtSign(payload)
      await delay(randomInt(300, 600))
      return await reply.status(200).send({ token })
    }
  )

  publicRoutes.post(
    '/initiate-verification/:userId',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        response: {
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { userId } = request.params
      const user = await fetchUser(userId)
      await initiateVerification(userId, user.email).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'User not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(204).send()
    }
  )

  publicRoutes.put(
    '/complete-verification/:userId',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        body: Type.String(),
        response: {
          200: Type.Object({ userId: Type.String() }),
          401: Type.Object({ message: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const verificationId = request.body
      const verified = await completeVerification(verificationId, request.params.userId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'User to be verified not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(200).send({ userId: verified.userId })
    }
  )

  return done()
}
