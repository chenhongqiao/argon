import { FastifyPluginCallback } from 'fastify'

import { registerUser, sendVerificationEmail, fetchUser, verifyUser, authenicateUser } from '../services/user.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'
import { AuthenicationError, AuthorizationError, ConflictError, delay, NewUserSchema, NotFoundError } from '@proejct-carbon/shared'

import { EmailVerification, JWTPayloadType, UserAuth } from '../types/JWTPayload.types'

import { randomInt } from 'node:crypto'

export const userRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userID: Type.String() }),
          409: Type.Object({ message: Type.String() })
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
          return await reply.status(409).send({ message: err.message })
        } else {
          throw err
        }
      }
    }
  )

  route.post(
    '/:userID/send-verification',
    {
      schema: {
        params: Type.Object({ userID: Type.String() }),
        response: {
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { userID } = request.params
      try {
        const user = await fetchUser(userID)
        const token = await reply.jwtSign({ userID: user.id, type: JWTPayloadType.EmailVerification })
        await sendVerificationEmail(user.email, token)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'User not found.' })
        } else {
          throw err
        }
      }
    }
  )

  route.put(
    '/:userID/verify-email',
    {
      schema: {
        params: Type.Object({ userID: Type.String() }),
        response: {
          200: Type.Object({ userID: Type.String() }),
          401: Type.Object({ message: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      let decoded: EmailVerification
      try {
        decoded = await request.jwtVerify()
      } catch (err) {
        return await reply.status(401).send({ message: 'Invalid authorization token.' })
      }
      if (decoded.userID !== request.params.userID || decoded.type !== JWTPayloadType.EmailVerification) {
        return await reply.status(401).send({ message: 'Invalid authorization token.' })
      }
      try {
        const verified = await verifyUser(request.params.userID)
        return await reply.status(200).send({ userID: verified.userID })
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'User to be verified not found.' })
        } else {
          throw err
        }
      }
    }
  )

  route.post(
    '/:userID/login',
    {
      schema: {
        params: Type.Object({ userID: Type.String() }),
        body: Type.Object({ usernameOrEmail: Type.String(), password: Type.String() }),
        response: {
          200: Type.Object({ token: Type.String() }),
          401: Type.Object({ message: Type.String() }),
          403: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      try {
        const { usernameOrEmail, password } = request.body
        const authenicated = await authenicateUser(usernameOrEmail, password)
        const payload: UserAuth = { type: JWTPayloadType.UserAuth, userID: authenicated.userID, role: authenicated.role }
        const token = await reply.jwtSign(payload)
        await delay(randomInt(300, 600))
        return await reply.status(200).send({ token })
      } catch (err) {
        if (err instanceof AuthenicationError) {
          return await reply.status(401).send({ message: 'Login failed.' })
        } else if (err instanceof AuthorizationError) {
          return await reply.status(403).send({ message: 'Please verify your email first.' })
        } else {
          throw err
        }
      }
    }
  )
  done()
}
