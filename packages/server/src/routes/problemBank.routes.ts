import {
  NewProblemSchema,
  NotFoundError,
  ProblemSchema,
  NewSubmissionSchema,
  SubmissionResultSchema
} from '@project-carbon/shared'

import {
  createInProblemBank,
  deleteProblem,
  fetchDomainProblems,
  fetchFromProblemBank,
  updateProblem
} from '../services/problem.services'

import {
  compileSubmission,
  createSubmission,
  fetchSubmission
} from '../services/submission.services'

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
      const { domainId } = request.params
      const created = await createInProblemBank(problem, domainId)
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
      const problem = await fetchFromProblemBank(problemId, domainId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(200).send(problem)
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
      const problems = await fetchDomainProblems(domainId)
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
      const { problemId, domainId } = request.params
      const problem = request.body
      const updated = await updateProblem(problem, problemId, domainId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(200).send(updated)
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

  authned.post(
    '/:domainId/:problemId/submissions',
    {
      schema: {
        body: NewSubmissionSchema,
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          201: Type.Object({ submissionId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        },
        preHandler: [authned.auth([verifyTeamScope(['problemBank.test'])]) as any]
      }
    },
    async (request, reply) => {
      const submission = request.body
      const { domainId, problemId } = request.params
      const problem = await fetchFromProblemBank(problemId, domainId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Problem not found.' })
        } else {
          throw err
        }
      })

      const created = await createSubmission(submission, { id: problem.id, domainId: problem.domainId }, request.user.userId)
      await compileSubmission(created.submissionId)
      return await reply.status(201).send(created)
    }
  )

  authned.get(
    '/:domainId/:problemId/submissions/:submissionId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String(), submissionId: Type.String() }),
        response: {
          200: SubmissionResultSchema,
          404: Type.Object({ message: Type.String() })
        },
        preHandler: [authned.auth([verifyTeamScope(['problemBank.test'])]) as any]
      }
    },
    async (request, reply) => {
      const { domainId, submissionId, problemId } = request.params
      const submission = await fetchSubmission(submissionId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Submission not found.' })
        } else {
          throw err
        }
      })

      if (submission.problem.id !== problemId || submission.problem.id !== domainId) {
        return await reply.status(404).send({ message: 'Submission not found.' })
      }

      return await reply.status(200).send(submission)
    }
  )
  return done()
}
