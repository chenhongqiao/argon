import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { Sentry } from '../connections/sentry.connections'

import { verifySuperAdmin } from '../auth/superAdmin.auth'
import { userIdExists } from '../services/user.services'
import { JWTPayload } from '../types'
import { UserRole } from '@argoncs/types'

import { randomUUID } from 'crypto'

export const judgerRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Authentication is required for judger operations.')
    }
  })
  privateRoutes.get(
    '/authentication-token',
    {
      schema: {
        response: {
          200: Type.Object({ token: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin]) as any]
    },
    async (request, reply) => {
      try {
        let userId: string = randomUUID()
        while (await userIdExists(userId)) {
          userId = randomUUID()
        }
        const payload: JWTPayload = { userId, scopes: {}, role: UserRole.Judger }
        const token = await reply.jwtSign(payload)
        return await reply.status(200).send({ token })
      } catch (err) {
        Sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred when creating token for judgers.')
      }
    }
  )
  return done()
}
