import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { version, name } from '../../package.json'

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
      return await reply.status(200).send({ version, online: true, name })
    }
  )
  return done()
}
