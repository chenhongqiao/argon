import {
  NewProblemSchema,
  NotFoundError,
  ProblemSchema,
  NewSubmissionSchema,
  SubmissionResultSchema,
  AuthorizationError
} from '@cocs/shared'

import {
  createInProblemBank,
  deleteInProblemBank,
  fetchDomainProblems,
  fetchFromProblemBank,
  updateInProblemBank
} from '../services/problem.services'

import {
  compileSubmission,
  createSubmission,
  fetchSubmission
} from '../services/submission.services'

import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

import { verifyDomainScope } from '../auth/domainScope.auth'
import { Sentry } from '../connections/sentry.connections'

export const problemBankRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Please authenticate first.')
    }
  })

  privateRoutes.post(
    '/:domainId',
    {
      schema: {
        body: NewProblemSchema,
        params: Type.Object({ domainId: Type.String() }),
        response: {
          201: Type.Object({ problemId: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const problem = request.body
      const { domainId } = request.params
      try {
        const created = await createInProblemBank(problem, domainId)
        return await reply.status(201).send(created)
      } catch (err) {
        if (err instanceof NotFoundError || err instanceof AuthorizationError) {
          reply.notFound('One or more of the testcases does not exist.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  privateRoutes.get(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: { 200: ProblemSchema }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      try {
        const problem = await fetchFromProblemBank(problemId, domainId)
        return await reply.status(200).send(problem)
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('Problem not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  privateRoutes.get(
    '/:domainId',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema)
        },
        params: Type.Object({ domainId: Type.String() })
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
        body: ProblemSchema,
        response: {
          200: Type.Object({ problemId: Type.String() }),
          404: Type.Object({ message: Type.String() })
        },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]

    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = request.body
      try {
        const updated = await updateInProblemBank(problem, problemId, domainId)
        return await reply.status(200).send(updated)
      } catch (err) {
        if (err instanceof NotFoundError) {
          if (err.message === 'Blob not found.') {
            reply.notFound('One or more of the testcases does not exist.')
          } else {
            reply.notFound('Problem not found.')
          }
        } else if (err instanceof AuthorizationError) {
          reply.notFound('One or more of the testcases does not exist.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  privateRoutes.delete(
    '/:domainId/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      try {
        await deleteInProblemBank(problemId, domainId)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('Problem not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  privateRoutes.post(
    '/:domainId/:problemId/submissions',
    {
      schema: {
        body: NewSubmissionSchema,
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          202: Type.Object({ submissionId: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const submission = request.body
      const { domainId, problemId } = request.params
      try {
        const problem = await fetchFromProblemBank(problemId, domainId)
        const created = await createSubmission(submission, { id: problem.id, domainId: problem.domainId }, request.user.userId)
        await compileSubmission(created.submissionId)
        return await reply.status(202).send(created)
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('Problem not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    }
  )

  privateRoutes.get(
    '/:domainId/:problemId/submissions/:submissionId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String(), submissionId: Type.String() }),
        response: {
          200: SubmissionResultSchema
        }
      },
      preValidation: [privateRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const { domainId, submissionId, problemId } = request.params
      try {
        const submission = await fetchSubmission(submissionId)

        if (submission.problem.id !== problemId || submission.problem.domainId !== domainId) {
          return reply.notFound('Submission not found.')
        }

        return await reply.status(200).send(submission)
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound('Submission not found.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when handling the request.')
        }
      }
    })

  return done()
}
