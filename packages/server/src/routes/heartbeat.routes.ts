import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { version } from '../../package.json'

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
    (request, reply) => {
      void reply.status(200).send({ version, online: true })
    }
  )
  return done()
}
