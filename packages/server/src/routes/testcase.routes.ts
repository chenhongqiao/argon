import { FastifyPluginCallback } from 'fastify'

import { deleteTestcase, uploadTestcase, verifyTestcaseDomain } from '../services/testcase.services'
import { AuthorizationError, NotFoundError } from '@argoncs/types'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/domainScope.auth'
import { Sentry } from '../connections/sentry.connections'

import multipart from '@fastify/multipart'

export const testcaseRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  void app.register(multipart, {
    limits: {
      fileSize: 20971520,
      files: 50
    }
  })

  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Authentication is required to manage testcases.')
    }
  })

  privateRoutes.post(
    '/:domainId',
    {
      schema: {
        response: {
          201: Type.Array(Type.Object({ testcaseId: Type.String() }))
        },
        params: Type.Object({ domainId: Type.String() })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      try {
        const queue: Array<Promise<{ testcaseId: string }>> = []
        const files = await request.saveRequestFiles()
        files.forEach(testcase => {
          queue.push(uploadTestcase(testcase.filepath, domainId))
        })
        const results = await Promise.all(queue)
        return await reply.status(201).send(results)
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

  privateRoutes.delete(
    '/:domainId/:testcaseId',
    {
      schema: {
        params: Type.Object({ testcaseId: Type.String(), domainId: Type.String() }),
        response: {
          404: Type.Object({ message: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { testcaseId, domainId } = request.params
      try {
        await verifyTestcaseDomain(testcaseId, domainId)
        await deleteTestcase(testcaseId)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError || err instanceof AuthorizationError) {
          reply.notFound('Testcase not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when deleting a testcase.')
        }
      }
    }
  )
  return done()
}
