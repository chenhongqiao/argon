import { FastifyPluginCallback } from 'fastify'

import { uploadTestcase } from '../services/testcases.service'

export const testcasesRoutes: FastifyPluginCallback = (app, options, done) => {
  app.post(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } } }
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
        await reply.status(200).send(results)
      } catch (err) {
        console.error(err)
        await reply.status(500).send({ message: 'Server error' })
      }
    }
  )
  done()
}
