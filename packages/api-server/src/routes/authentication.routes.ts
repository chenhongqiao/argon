import { FastifyPluginCallback } from 'fastify'

import { registerUser, initiateVerification, fetchUser, completeVerification, authenticateUser } from '../services/user.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'
import { NewUserSchema, JWTPayloadType }
  from '@argoncs/types'
import { delay } from '../../../common/src'

import { randomInt } from 'node:crypto'

export const authenticationRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.post(
    '/register',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userId: Type.RegEx(/^[a-f\d]{24}$/i) })
        }
      }
    },
    async (request, reply) => {
      const user = request.body
      const registered = await registerUser(user)
      return await reply.status(201).send(registered)
    }
  )

  publicRoutes.post(
    '/login',
    {
      schema: {
        body: Type.Object({ usernameOrEmail: Type.String(), password: Type.String() }),
        response: {
          200: Type.Object({ userId: Type.RegEx(/^[a-f\d]{24}$/i) })
        }
      }
    },
    async (request, reply) => {
      const { usernameOrEmail, password } = request.body
      const authenicated = await authenticateUser(usernameOrEmail, password)
      const { userId } = authenicated
      await delay(randomInt(300, 600))
      request.session.set('userId', userId)
      return await reply.status(200).send({ userId })
    }
  )

  publicRoutes.get(
    '/initiate-verification/:userId',
    {
      schema: {
        params: Type.Object({ userId: Type.RegEx(/^[a-f\d]{24}$/i) })
      }
    },
    async (request, reply) => {
      const { userId } = request.params
      const user = await fetchUser(userId)
      const token = await reply.jwtSign({ type: JWTPayloadType.EmailVerification, email: user.email, userId: user.id }, { expiresIn: '15m' })
      await initiateVerification(user.email, token)
      return await reply.status(204).send()
    }
  )

  publicRoutes.put(
    '/complete-verification',
    {
      schema: {
        response: {
          200: Type.Object({ modified: Type.Boolean() })
        }
      }
    },
    async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.unauthorized('Must provide verification token to complete email verification.')
      }
      if (request.user.type !== JWTPayloadType.EmailVerification) {
        return reply.unauthorized('Must provide verification token to complete email verification.')
      }
      const { modified } = await completeVerification(request.user.userId, request.user.email)
      return await reply.status(200).send({ modified })
    }
  )

  return done()
}
