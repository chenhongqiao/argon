import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { version } from '../../package.json'

export const heartbeatRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Object({ version: Type.String(), ready: Type.Boolean() })
        }
      }
    },
    (request, reply) => {
      void reply.status(200).send({ version, ready: true })
    }
  )
  done()
}
