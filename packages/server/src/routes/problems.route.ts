import { FastifyPluginCallback } from 'fastify'

import {
  NotFoundError, NewProblem,
  NewProblemSchema,
  Problem,
  ProblemSchema
} from '@project-carbon/shared'
import { Type } from '@sinclair/typebox'
import {
  createProblem,
  deleteProblem,
  fetchAllProblems,
  fetchProblem,
  updateProblem
} from '../services/problems.service'

export const problemsRoutes: FastifyPluginCallback = (app, options, done) => {
  app.post<{ Body: NewProblem }>(
    '/',
    {
      schema: {
        body: NewProblemSchema,
        response: {
          200: { type: 'object', properties: { problemID: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const problem = request.body
      try {
        const result = await createProblem(problem)
        void reply.status(200).send(result)
      } catch (err) {
        void reply.status(500).send({ message: 'Server error' })
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
        void reply.status(200).send(problem)
      } catch (err) {
        if (err instanceof NotFoundError) {
          void reply.status(404).send({ message: 'Problem not found' })
        } else {
          void reply.status(500).send({ message: 'Server error' })
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
        void reply.status(200).send(problems)
      } catch (err) {
        void reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  app.put<{ Body: Problem }>(
    '/',
    {
      schema: {
        body: ProblemSchema,
        response: {
          200: { type: 'object', properties: { problemID: { type: 'string' } } },
          400: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      try {
        const problem = request.body
        const result = await updateProblem(problem)
        void reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          void reply.status(404).send({ message: 'Problem not found' })
        } else {
          void reply.status(500).send({ message: 'Server error' })
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
          200: { type: 'object', properties: { problemID: { type: 'string' } } },
          404: { type: 'object', properties: { message: { type: 'string' } } },
          500: { type: 'object', properties: { message: { type: 'string' } } }
        }
      }
    },
    async (request, reply) => {
      const { problemID } = request.params
      try {
        const result = await deleteProblem(problemID)
        void reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          void reply.status(404).send({ message: 'Problem not found' })
        } else {
          void reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )
  done()
}
