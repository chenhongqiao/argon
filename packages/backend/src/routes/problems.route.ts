import { FastifyPluginCallback } from 'fastify'

import { NotFoundError } from '@project-carbon/common'
import { Type } from '@sinclair/typebox'
import {
  createProblem,
  deleteProblem,
  fetchProblem,
  fetchAllProblems,
  updateProblem,

  NewProblemSchema,
  NewProblem,
  ProblemSchema,
  Problem
} from '../services/problems.service'

export const problemsRoutes: FastifyPluginCallback = (app, options, done) => {
  app.post<{ Body: NewProblem }>(
    '/',
    {
      schema: {
        body: NewProblemSchema,
        response: {
          200: { type: 'object', properties: { id: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const problem = request.body
      try {
        const result = await createProblem(problem)
        await reply.status(200).send(result)
      } catch (err) {
        await reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  app.get<{ Params: { problemID: string } }>(
    '/:problemID',
    {
      schema: {
        params: {
          problemID: { type: 'string' }
        },
        response: {
          200: ProblemSchema,
          404: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { problemID } = request.params
      try {
        const problem = await fetchProblem(problemID)
        await reply.status(200).send(problem)
      } catch (err) {
        if (err instanceof NotFoundError) {
          await reply.status(404).send({ message: 'Problem not found' })
        } else {
          await reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )

  app.get<{ Params: { problemID: string } }>(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema),
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      try {
        const problems = await fetchAllProblems()
        await reply.status(200).send(problems)
      } catch (err) {
        await reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  app.put<{ Body: Problem }>(
    '/',
    {
      schema: {
        body: ProblemSchema,
        response: {
          200: { type: 'object', properties: { id: { type: 'string' } } },
          400: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      try {
        const problem = request.body
        const result = await updateProblem(problem)
        await reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          await reply.status(404).send({ message: 'Problem not found' })
        } else {
          await reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )

  app.delete<{ Params: { problemID: string } }>(
    '/:problemID',
    {
      schema: {
        params: {
          problemID: { type: 'string' }
        },
        response: {
          200: { type: 'object', properties: { id: { type: 'string' } } },
          404: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { problemID } = request.params
      try {
        const result = await deleteProblem(problemID)
        await reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          await reply.status(404).send({ message: 'Problem not found' })
        } else {
          await reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )
  done()
}
