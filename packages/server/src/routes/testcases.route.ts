import { FastifyPluginCallback } from 'fastify'

import { uploadTestcase, deleteTestcase } from '../services/testcases.service'
import { NotFoundError } from '@project-carbon/shared/dist/src'

export const testcasesRoutes: FastifyPluginCallback = (app, options, done) => {
  app.post(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: { type: 'object', properties: { testcaseID: { type: 'string' } } }
          },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const testcases = request.parts()
      const queue: Array<Promise<{id: string}>> = []
      try {
        for await (const file of testcases) {
          queue.push(uploadTestcase(file))
        }
        const results = await Promise.all(queue)
        void reply.status(200).send(results)
      } catch (err) {
        void reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  app.delete<{ Params: { testcaseID: string } }>(
    '/:testcaseID',
    {
      schema: {
        params: {
          testcaseID: {
            type: 'string'
          }
        },
        response: {
          200: { type: 'object', properties: { testcaseID: { type: 'string' } } },
          404: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { testcaseID } = request.params
      try {
        const result = await deleteTestcase(testcaseID)
        void reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          void reply.status(404).send({ message: 'Testcase not found' })
        } else {
          void reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )
  done()
}
