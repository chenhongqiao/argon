import { authenticateUser, deleteSessionByToken, fetchSessionByToken, fetchUserSessions } from '../../services/session.services.js'

import { Type } from '@sinclair/typebox'
import { delay } from '@argoncs/common'

import { randomInt } from 'node:crypto'
import { type FastifyTypeBox } from '../../types.js'
import { badRequestSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { type PrivateUserProfile, PrivateUserProfileSchema, UserLoginSchema, UserSessionSchema } from '@argoncs/types'
import { userAuthHook } from '../../hooks/authentication.hooks.js'
import { requestAuthProfile, requestSessionToken } from '../../utils/auth.utils.js'
import { fetchUser } from '../../services/user.services.js'

export async function userSessionRoutes (userSessionRoutes: FastifyTypeBox): Promise<void> {
  userSessionRoutes.post(
    '/',
    {
      schema: {
        body: UserLoginSchema,
        response: {
          200: Type.Object({ userId: Type.String(), sessionId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema
        }
      }
    },
    async (request, reply) => {
      const { usernameOrEmail, password } = request.body
      const { sessionId, token, userId } = await authenticateUser({ usernameOrEmail, password, loginIP: request.ip, userAgent: request.headers['user-agent'] ?? 'Unknown' })
      await delay(randomInt(300, 600))
      return await reply.status(200).setCookie('session_token', token, { path: '/', httpOnly: true, signed: true }).send({ sessionId, userId })
    }
  )

  userSessionRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(Type.Omit(UserSessionSchema, ['token'])),
          400: badRequestSchema,
          401: unauthorizedSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook as any]
    },
    async (request, reply) => {
      const userId = requestAuthProfile(request).id
      await reply.status(200).send([fetchUserSessions({ userId })])
    }
  )
}

export async function currentSessionRoutes (currentSessionRoutes: FastifyTypeBox): Promise<void> {
  currentSessionRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Union([Type.Object({
            session: Type.Object({ userId: Type.String(), sessionId: Type.String() }),
            profile: PrivateUserProfileSchema
          }), Type.Null()])
        }
      }
    },
    async (request, reply) => {
      try {
        await userAuthHook(request, reply)
        const { token } = requestSessionToken(request)
        const { userId, id } = await fetchSessionByToken({ sessionToken: token })
        const { username, name, email, newEmail, scopes, role, teams } = await fetchUser({ userId })
        const privateProfile: PrivateUserProfile = { username, name, email, newEmail, scopes, id: userId, role, teams }
        return await reply.status(200).send({ session: { userId, sessionId: id }, profile: privateProfile })
      } catch (err) {
        return await reply.status(200).send(null)
      }
    }
  )

  currentSessionRoutes.delete(
    '/',
    {
      schema: {
        response: {
          401: unauthorizedSchema,
          404: notFoundSchema
        },
        onRequest: [userAuthHook as any]
      }
    },
    async (request, reply) => {
      const { token } = requestSessionToken(request)
      await deleteSessionByToken({ sessionToken: token })
      await reply.status(204).clearCookie('session_token').send()
    }
  )
}
