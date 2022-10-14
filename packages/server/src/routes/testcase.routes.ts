import { FastifyPluginCallback } from 'fastify'

import { deleteTestcase, uploadTestcase } from '../services/testcase.services'
import { NotFoundError } from '@project-carbon/shared'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'

export const testcaseRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        response: {
          201: Type.Array(Type.Object({ testcaseId: Type.String() }))
        }
      }
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

  route.delete(
    '/:testcaseId',
    {
      schema: {
        params: Type.Object({ testcaseId: Type.String() }),
        response: {
          200: Type.Object({ testcaseId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { testcaseId } = request.params
      try {
        const deleted = await deleteTestcase(testcaseId)
        return await reply.status(200).send(deleted)
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Testcase not found.' })
        } else {
          throw err
        }
      }
    }
  )
  return done()
}
