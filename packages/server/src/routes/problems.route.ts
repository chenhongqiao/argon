import { FastifyPluginCallback } from 'fastify'

import {
  NewProblemSchema,
  NotFoundError,
  ProblemSchema
} from '@project-carbon/shared'
import {
  createProblem,
  deleteProblem,
  fetchAllProblems,
  fetchProblem,
  updateProblem
} from '../services/problems.service'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const problemsRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewProblemSchema,
        response: {
          201: Type.Object({ problemID: Type.String() }),
          500: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const problem = request.body
      try {
        const result = await createProblem(problem)
        void reply.status(201).send(result)
      } catch (err) {
        void reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  route.get(
    '/:problemID',
    {
      schema: {
        params: Type.Object({ problemID: Type.String() }),
        response: {
          200: ProblemSchema,
          404: Type.Object({ message: Type.String() }),
          500: Type.Object({ message: Type.String() })
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

  route.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema),
          500: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      try {
        const problems = await fetchAllProblems()
        void reply.status(200).send(problems)
      } catch (err) {
        console.log(err)
        void reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  route.put(
    '/',
    {
      schema: {
        body: ProblemSchema,
        response: {
          200: Type.Object({ problemID: Type.String() }),
          404: Type.Object({ message: Type.String() }),
          500: Type.Object({ message: Type.String() })
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

  route.delete(
    '/:problemID',
    {
      schema: {
        params: Type.Object({ problemID: Type.String() }),
        response: {
          200: Type.Object({ problemID: Type.String() }),
          404: Type.Object({ message: Type.String() }),
          500: Type.Object({ message: Type.String() })
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
