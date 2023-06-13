import { registerUser, initiateVerification, completeVerification, authenticateUser } from '../services/user.services.js'

import { Type } from '@sinclair/typebox'
import { NewUserSchema, JWTPayloadType }
  from '@argoncs/types'
import { delay } from '@argoncs/common'

import { randomInt } from 'node:crypto'
import { FastifyTypeBox } from '../types.js'

export async function authenticationRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox, options, done) => {
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
            200: Type.Object({ userId: Type.String() })
          }
        }
      },
      async (request, reply) => {
        const { usernameOrEmail, password } = request.body
        const { userId, sessionId } = await authenticateUser(usernameOrEmail, password, request.headers['user-agent'] ?? 'Unknown', request.ip)
        await delay(randomInt(300, 600))
        const token = await reply.jwtSign({ type: JWTPayloadType.Identification, userId, sessionId })
        return await reply.status(200).setCookie('session_token', token, { path: '/', httpOnly: true }).send({ userId })
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
        await initiateVerification(userId)
        return await reply.status(204).send()
      }
    )

    publicRoutes.put(
      '/complete-verification',
      {
        schema: {
          body: Type.Object({
            token: Type.String()
          }),
          response: {
            200: Type.Object({ modified: Type.Boolean() })
          }
        }
      },
      async (request, reply) => {
        const { token } = request.body
        const { modified } = await completeVerification(token)
        return await reply.status(200).send({ modified })
      }
    )

    done()
  })
}
