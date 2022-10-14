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
} from '../services/problemBank.services'

import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import verifyTeamScope from '../auth/verifyTeamScope'

export const problemBankRoutes: FastifyPluginCallback = (app, options, done) => {
  const authned = app.withTypeProvider<TypeBoxTypeProvider>()
  authned.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send('Please login first.')
    }
  })

  authned.post(
    '/:domainId',
    {
      schema: {
        body: NewProblemSchema,
        params: Type.Object({ domainId: Type.String() }),
        response: {
          201: Type.Object({ problemId: Type.String() })
        }
      },
      preHandler: [authned.auth([verifyTeamScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const problem = request.body
      const created = await createProblem(problem, request.user.userId)
      return await reply.status(201).send(created)
    }
  )

  authned.get(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          200: ProblemSchema,
          404: Type.Object({ message: Type.String() })
        }
      },
      preHandler: [authned.auth([verifyTeamScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      try {
        const problem = await fetchProblem(problemId, domainId)
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

  authned.get(
    '/:domainId',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema)
        },
        params: Type.Object({ domainId: Type.String() })
      },
      preHandler: [authned.auth([verifyTeamScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const problems = await fetchAllProblems(domainId)
      return await reply.status(200).send(problems)
    }
  )

  authned.put(
    '/:domainId/:problemId',
    {
      schema: {
        body: Type.Omit(ProblemSchema, ['id', 'domainId'], { additionalProperties: false }),
        response: {
          200: Type.Object({ problemId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        preHandler: [authned.auth([verifyTeamScope(['problemBank.manage'])]) as any]
      }
    },
    async (request, reply) => {
      try {
        const { problemId, domainId } = request.params
        const problem = request.body
        const updated = await updateProblem(problem, problemId, domainId)
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

  authned.delete(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          200: Type.Object({ problemId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        }
      },
      preHandler: [authned.auth([verifyTeamScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      try {
        const deleted = await deleteProblem(problemId, domainId)
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
  return done()
}
