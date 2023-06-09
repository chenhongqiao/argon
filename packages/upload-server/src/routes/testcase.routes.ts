import { uploadTestcase } from '../services/testcase.services.js'

import { Type } from '@sinclair/typebox'
import multipart from '@fastify/multipart'
import { JWTPayloadType } from '@argoncs/types'
import { FastifyTypeBox } from '../types.js'
import { BadRequestError, PayloadTooLargeError, UnauthorizedError } from 'http-errors-enhanced'
import { verifyTestcaseUpload } from '../auth/upload.auth.js'

export async function testcaseRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register(async (privateRoutes: FastifyTypeBox) => {
    await app.register(multipart.default, {
      limits: {
        fileSize: 20971520,
        files: 200
      }
    })

    privateRoutes.addHook('preValidation', async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        throw new UnauthorizedError('JWT token verification failed.')
      }
      if (request.user.type !== JWTPayloadType.Upload) {
        throw new UnauthorizedError('JWT token must be valid for testcase upload.')
      }
    })

    privateRoutes.post(
      '/:domainId/:problemId',
      {
        schema: {
          params:
            Type.Object({ domainId: Type.String(), problemId: Type.String() }),
          response: {
            201: Type.Array(Type.Object({ versionId: Type.String(), objectName: Type.String() }))
          }
        },
        preValidation: [privateRoutes.auth([verifyTestcaseUpload]) as any]
      },
      async (request, reply) => {
        try {
          const { domainId, problemId } = request.params
          const testcases = request.files()
          const queue: Array<Promise<{ versionId: string, objectName: string }>> = []
          for await (const testcase of testcases) {
            queue.push(uploadTestcase(domainId, problemId, testcase))
          }
          return await reply.status(201).send(await Promise.all(queue))
        } catch (err) {
          if (err instanceof app.multipartErrors.InvalidMultipartContentTypeError) {
            throw new BadRequestError('Request must be multipart.')
          } else if (err instanceof app.multipartErrors.FilesLimitError) {
            throw new PayloadTooLargeError('Too many files in one request.')
          } else if (err instanceof app.multipartErrors.RequestFileTooLargeError) {
            throw new PayloadTooLargeError('Testcase too large to be processed.')
          } else {
            throw err
          }
        }
      }
    )
  })
}
