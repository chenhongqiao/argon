import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/scope.auth.js'

import { FastifyTypeBox } from '../types.js'
import { userAuthHook } from '../hooks/authentication.hooks.js'
import { createUploadSession } from '../services/testcase.services.js'

export async function testcaseRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((privateRoutes: FastifyTypeBox, options, done) => {
    privateRoutes.addHook('preValidation', userAuthHook)

    privateRoutes.get(
      '/:domainId/:problemId/upload-credential',
      {
        schema: {
          response: {
            200: Type.Object({ uploadId: Type.String() })
          },
          params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
        },
        preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
      },
      async (request, reply) => {
        const { domainId, problemId } = request.params
        const { uploadId } = await createUploadSession(problemId, domainId)
        await reply.status(200).send({ uploadId })
      }
    )

    done()
  })
}
