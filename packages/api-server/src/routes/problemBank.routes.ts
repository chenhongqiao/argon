import {
  NewProblemSchema,
  ProblemSchema,
  NewSubmissionSchema,
  SubmissionType,
  TestingSubmissionSchema,
  ContestSubmissionSchema,
  JWTPayloadType
} from '@argoncs/types'

import {
  createInProblemBank,
  deleteInProblemBank,
  fetchDomainProblems,
  fetchFromProblemBank,
  updateInProblemBank
} from '../services/problem.services'

import {
  queueSubmission,
  createTestingSubmission,
  fetchSubmission
} from '../services/submission.services'

import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/domainScope.auth'

export const problemBankRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      if (request.user.type !== JWTPayloadType.Identification) {
        return reply.unauthorized('JWT Token must be valid for identification.')
      }
    } catch (err) {
      reply.unauthorized('Authentication is required to access the problem bank.')
    }
  })

  privateRoutes.post(
    '/:domainId',
    {
      schema: {
        body: NewProblemSchema,
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) }),
        response: {
          201: Type.Object({ problemId: Type.RegEx(/^[a-f\d]{24}$/i) })
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const problem = request.body
      const { domainId } = request.params
      const created = await createInProblemBank(problem, domainId)
      return await reply.status(201).send(created)
    }
  )

  privateRoutes.get(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i) }),
        response: { 200: ProblemSchema }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = await fetchFromProblemBank(problemId, domainId)
      return await reply.status(200).send(problem)
    }
  )

  privateRoutes.get(
    '/:domainId',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema)
        },
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const problems = await fetchDomainProblems(domainId)
      return await reply.status(200).send(problems)
    }
  )

  privateRoutes.put(
    '/:domainId/:problemId',
    {
      schema: {
        body: Type.Partial(NewProblemSchema),
        response: { 200: Type.Object({ modified: Type.Boolean() }) },
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i) })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]

    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = request.body
      const { modified } = await updateInProblemBank(problemId, domainId, problem)
      return await reply.status(200).send({ modified })
    }
  )

  privateRoutes.delete(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i) })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      await deleteInProblemBank(problemId, domainId)
      return await reply.status(204).send()
    }
  )

  privateRoutes.post(
    '/:domainId/:problemId/submissions',
    {
      schema: {
        body: NewSubmissionSchema,
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i) }),
        response: {
          202: Type.Object({ submissionId: Type.RegEx(/^[a-f\d]{24}$/i) })
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const submission = request.body
      const { domainId, problemId } = request.params
      const problem = await fetchFromProblemBank(problemId, domainId)
      if (problem.testcases == null) {
        return reply.methodNotAllowed('Testcases must be uploaded before a problem can be tested.')
      }
      const created = await createTestingSubmission(submission, problem.domainId, problem.id, request.user.userId)
      await queueSubmission(created.submissionId)
      return await reply.status(202).send(created)
    }
  )

  privateRoutes.get(
    '/:domainId/:problemId/submissions/:submissionId',
    {
      schema: {
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), problemId: Type.RegEx(/^[a-f\d]{24}$/i), submissionId: Type.RegEx(/^[a-f\d]{24}$/i) }),
        response: {
          200: Type.Union([TestingSubmissionSchema, ContestSubmissionSchema])
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const { domainId, submissionId, problemId } = request.params
      const submission = await fetchSubmission(submissionId)

      if (submission.type !== SubmissionType.Testing || submission.problemId !== problemId || submission.domainId !== domainId) {
        return reply.notFound('Submission not found.')
      }

      return await reply.status(200).send(submission)
    })

  return done()
}
