import { FastifyPluginCallback } from 'fastify'

import { deleteTestcase, uploadTestcase } from '../services/testcase.services'
import { NotFoundError } from '@project-carbon/shared'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'

import verifyAnyScope from '../auth/verifyAnyScope'

export const testcaseRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send('Please login first.')
    }
  })

  privateRoutes.post(
    '/',
    {
      schema: {
        response: {
          201: Type.Array(Type.Object({ testcaseId: Type.String() }))
        }
      },
      preValidation: [privateRoutes.auth([verifyAnyScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const queue: Array<Promise<{testcaseId: string}>> = []
      const files = await request.saveRequestFiles()
      files.forEach(testcase => {
        queue.push(uploadTestcase(testcase.filepath))
      })
      const results = await Promise.all(queue)
      return await reply.status(201).send(results)
    }
  )

  privateRoutes.delete(
    '/:testcaseId',
    {
      schema: {
        params: Type.Object({ testcaseId: Type.String() }),
        response: {
          200: Type.Object({ testcaseId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifyAnyScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { testcaseId } = request.params
      const deleted = await deleteTestcase(testcaseId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Testcase not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(200).send(deleted)
    }
  )
  return done()
}
