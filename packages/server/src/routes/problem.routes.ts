import { FastifyPluginCallback } from 'fastify'

import {
  NewProblemSchema,
  NotFoundError,
  ProblemSchema
} from '@cocs/common'
import {
  createProblem,
  deleteProblem,
  fetchAllProblems,
  fetchProblem,
  updateProblem
} from '../services/problem.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const problemRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewProblemSchema,
        response: {
          201: Type.Object({ problemID: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const problem = request.body
      const created = await createProblem(problem)
      return await reply.status(201).send(created)
    }
  )

  route.get(
    '/:problemID',
    {
      schema: {
        params: Type.Object({ problemID: Type.String() }),
        response: {
          200: ProblemSchema,
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { problemID } = request.params
      try {
        const problem = await fetchProblem(problemID)
        return await reply.status(200).send(problem)
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      }
    }
  )

  route.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema)
        }
      }
    },
    async (request, reply) => {
      const problems = await fetchAllProblems()
      return await reply.status(200).send(problems)
    }
  )

  route.put(
    '/',
    {
      schema: {
        body: ProblemSchema,
        response: {
          200: Type.Object({ problemID: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      try {
        const problem = request.body
        const updated = await updateProblem(problem)
        return await reply.status(200).send(updated)
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      }
    }
  )

  route.delete(
    '/:problemID',
    {
      schema: {
        params: Type.Object({ problemID: Type.String() }),
        response: {
          200: Type.Object({ problemID: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { problemID } = request.params
      try {
        const deleted = await deleteProblem(problemID)
        return await reply.status(200).send(deleted)
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      }
    }
  )
  done()
}
