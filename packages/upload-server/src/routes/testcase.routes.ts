import { consumeUploadSession, uploadTestcase } from '../services/testcase.services.js'
import { uploadPolygon } from '../services/polygon.services.js'

import { Type } from '@sinclair/typebox'
import multipart from '@fastify/multipart'
import { type FastifyTypeBox } from '../types.js'
import { BadRequestError, badRequestSchema, PayloadTooLargeError, unauthorizedSchema } from 'http-errors-enhanced'

export async function testcaseRoutes (routes: FastifyTypeBox): Promise<void> {
  await routes.register(multipart.default, {
    limits: {
      fileSize: 20971520,
      files: 200
    }
  })

  /**
   * Uploads testcases to session.
   * Testcases ppassed as request files.
   */
  routes.post(
    '/:uploadId',
    {
      schema: {
        params: Type.Object({ uploadId: Type.String() }),
        response: {
          201: Type.Array(Type.Object({ versionId: Type.String(), name: Type.String() })),
          400: badRequestSchema,
          401: unauthorizedSchema,
          413: Type.Object({ statusCode: Type.Number(), error: Type.String(), message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { uploadId } = request.params
      const { domainId, problemId } = await consumeUploadSession(uploadId)
      try {
        const testcases = request.files()
        const queue: Array<Promise<{ versionId: string, name: string }>> = []
        for await (const testcase of testcases) {
          queue.push(uploadTestcase(domainId, problemId, testcase))
        }
        return await reply.status(201).send(await Promise.all(queue))
      } catch (err) {
        if (err instanceof routes.multipartErrors.InvalidMultipartContentTypeError) {
          throw new BadRequestError('Request must be multipart')
        } else if (err instanceof routes.multipartErrors.FilesLimitError) {
          throw new PayloadTooLargeError('Too many files in one request')
        } else if (err instanceof routes.multipartErrors.RequestFileTooLargeError) {
          throw new PayloadTooLargeError('Testcase too large to be processed')
        } else {
          throw err
        }
      }
    }
  )

  /**
   * Uploads a zipped Polygon package.
   * Unzips and parses the package, and update the problem.
   */
  routes.post(
    '/:uploadId/polygon',
    {
      schema: {
        params: Type.Object({ uploadId: Type.String() }),
        response: {
          201: Type.Object({ problemId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          413: Type.Object({ statusCode: Type.Number(), error: Type.String(), message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { uploadId } = request.params
      const { domainId, problemId } = await consumeUploadSession(uploadId)

      const archive = await request.file()
      if (archive === undefined) {
        throw new BadRequestError('No file found in request')
      }

      await uploadPolygon(domainId, problemId, archive)

      return await reply.status(201).send({ problemId })
    }
  )
}
