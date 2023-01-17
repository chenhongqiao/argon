import { FastifyPluginCallback } from 'fastify'

import { uploadTestcase } from '../services/testcase.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { Sentry } from '../connections/sentry.connections'
import multipart from '@fastify/multipart'
import { JWTPayloadType } from '@argoncs/types'

export const testcaseRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  void app.register(multipart, {
    limits: {
      fileSize: 20971520,
      files: 200
    }
  })

  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Valid JWT token is required to upload testcases.')
    }
  })

  privateRoutes.post(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({
          domainId: Type.String(),
          problemId: Type.String()
        }),
        response: {
          201: Type.Object({ versionId: Type.String(), filename: Type.String() })
        }
      }
    },
    async (request, reply) => {
      try {
        const { domainId, problemId } = request.params
        if (request.user.type !== JWTPayloadType.Upload) {
          return reply.unauthorized('Invalid upload token.')
        }
        const { resource } = request.user
        if (resource.domainId !== domainId || resource.problemId !== problemId) {
          return reply.forbidden('Missing valid credential to upload to this resource.')
        }
        const testcase = await request.file()
        const result = await uploadTestcase(domainId, problemId, testcase)
        return await reply.status(201).send(result)
      } catch (err) {
        if (err instanceof app.multipartErrors.InvalidMultipartContentTypeError) {
          reply.badRequest('Request must be multipart.')
        } else if (err instanceof app.multipartErrors.FilesLimitError) {
          reply.payloadTooLarge('Too many files in one request.')
        } else if (err instanceof app.multipartErrors.RequestFileTooLargeError) {
          reply.payloadTooLarge('Testcase too large to be processed.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when creating a testcase.')
        }
      }
    }
  )

  return done()
}
