import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/scope.auth'

import { JWTPayloadType } from '@argoncs/types'
import { FastifyTypeBox } from '../types'
import { authJWTHook } from '../hooks/authentication.hooks'

export async function testcaseRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((privateRoutes: FastifyTypeBox) => {
    privateRoutes.addHook('preValidation', authJWTHook)

    privateRoutes.get(
      '/:domainId/:problemId/upload-credential',
      {
        schema: {
          response: {
            200: Type.Object({ token: Type.String() })
          },
          params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
        },
        preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
      },
      async (request, reply) => {
        const { domainId, problemId } = request.params
        await reply.status(200).send({ token: await reply.jwtSign({ type: JWTPayloadType.Upload, resource: { problemId, domainId }, userId: request.user.userId }) })
      }
    )
  })
}
