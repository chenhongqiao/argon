import { authenticateUser } from '../../services/user.services.js'

import { Type } from '@sinclair/typebox'
import { delay } from '@argoncs/common'

import { randomInt } from 'node:crypto'
import { type FastifyTypeBox } from '../../types.js'
import { badRequestSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { UserLoginSchema } from '@argoncs/types'

export async function sessionRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox, options, done) => {
    publicRoutes.post(
      '/',
      {
        schema: {
          body: UserLoginSchema,
          response: {
            200: Type.Object({ userId: Type.String() }),
            400: badRequestSchema,
            401: unauthorizedSchema
          }
        }
      },
      async (request, reply) => {
        const { usernameOrEmail, password } = request.body
        const { userId, sessionId } = await authenticateUser(usernameOrEmail, password, request.headers['user-agent'] ?? 'Unknown', request.ip)
        await delay(randomInt(300, 600))
        return await reply.status(200).setCookie('session_token', sessionId, { path: '/', httpOnly: true, signed: true }).send({ userId })
      }
    )
    done()
  })
}
