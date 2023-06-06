import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { version, name } from '../../package.json'
import { sentry } from '@argoncs/common'

export const heartbeatRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Object({ version: Type.String(), name: Type.String(), online: Type.Boolean() })
        }
      }
    },
    async (request, reply) => {
      try {
        return await reply.status(200).send({ version, online: true, name })
      } catch (err) {
        sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred during heartbeat.')
      }
    }
  )
  return done()
}
