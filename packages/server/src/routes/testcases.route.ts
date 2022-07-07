import { FastifyPluginCallback } from 'fastify'

import { deleteTestcase, uploadTestcase } from '../services/testcases.service'
import { NotFoundError } from '@project-carbon/shared/dist/src'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'

export const testcasesRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        response: {
          201: Type.Array(Type.Object({ testcaseID: Type.String() }))
        }
      }
    },
    async (request, reply) => {
      const queue: Array<Promise<{testcaseID: string}>> = []
      const files = await request.saveRequestFiles()
      files.forEach(testcase => {
        queue.push(uploadTestcase(testcase.filepath))
      })
      const results = await Promise.all(queue)
      console.log(results)
      void reply.status(201).send(results)
    }
  )

  route.delete(
    '/:testcaseID',
    {
      schema: {
        params: Type.Object({ testcaseID: Type.String() }),
        response: {
          200: Type.Object({ testcaseID: Type.String() }),
          404: Type.Object({ message: Type.String() })
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
          void reply.status(404).send({ message: 'Testcase not found.' })
        } else {
          throw err
        }
      }
    }
  )
  done()
}
