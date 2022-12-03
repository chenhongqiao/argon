import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { version } from '../../package.json'
import { Sentry } from '../connections/sentry.connections'

export const heartbeatRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Object({ version: Type.String(), online: Type.Boolean() })
        }
      }
    },
    async (request, reply) => {
      try {
        return await reply.status(200).send({ version, online: true })
      } catch (err) {
        Sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred when handling the request.')
      }
    }
  )
  return done()
}
