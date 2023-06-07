import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

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
        return await reply.status(200).send({ version: process.env.npm_package_version as string, online: true, name: process.env.npm_package_name as string })
      } catch (err) {
        sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred during heartbeat.')
      }
    }
  )
  return done()
}
