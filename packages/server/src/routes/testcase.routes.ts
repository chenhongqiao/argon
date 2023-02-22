import { FastifyPluginCallback } from 'fastify'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/domainScope.auth'

import { JWTPayloadType } from '@argoncs/types'

export const testcaseRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()

  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      if (request.user.type !== JWTPayloadType.Identification) {
        return reply.unauthorized('JWT token must be valid for identification.')
      }
    } catch (err) {
      reply.unauthorized('Authentication is required to manage testcases.')
    }
  })

  privateRoutes.get(
    '/:domainId/:problemId/upload-credential',
    {
      schema: {
        response: {
          200: Type.Object({ token: Type.String() })
        },
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i) })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { domainId, problemId } = request.params
      await reply.status(200).send({ token: await reply.jwtSign({ type: JWTPayloadType.Upload, resource: { problemId, domainId }, userId: request.user.userId }) })
    }
  )
  return done()
}
