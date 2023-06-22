import { Type } from '@sinclair/typebox'
import { AuthenticationProfile, ContestSubmissionSchema, DomainDetailSchema, NewDomainSchema, NewProblemSchema, NewSubmissionSchema, ProblemSchema, SubmissionType, TestingSubmissionSchema } from '@argoncs/types'
import { addOrUpdateDomainMember, createDomain, fetchDomainDetail, removeDomainMember, updateDomain } from '../services/domain.services.js'
import { verifySuperAdmin } from '../auth/role.auth.js'
import { verifyDomainScope } from '../auth/scope.auth.js'
import { FastifyTypeBox } from '../types.js'
import { userAuthHook } from '../hooks/authentication.hooks.js'
import { createInProblemBank, deleteInProblemBank, fetchDomainProblems, updateInProblemBank } from '../services/problem.services.js'
import { fetchFromProblemBank, fetchSubmission } from '@argoncs/common'
import { createTestingSubmission, queueSubmission } from '../services/submission.services.js'
import { createUploadSession } from '../services/testcase.services.js'

async function domainManagementRoutes (managementRoutes: FastifyTypeBox): Promise<void> {
  managementRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: DomainDetailSchema
        }
      }
    },
    async (request, reply) => {
      const { domainId } = request.params
      const domainDetail = await fetchDomainDetail(domainId)
      return domainDetail
    })

  managementRoutes.put(
    '/',
    {
      schema: {
        body: Type.Partial(NewDomainSchema),
        params: Type.Object({ domainId: Type.String() }),
        response: { 200: Type.Object({ modified: Type.Boolean() }) }
      },
      preValidation: [userAuthHook, managementRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const { modified } = await updateDomain(domainId, request.body)
      return await reply.status(200).send({ modified })
    }
  )
}

async function domainMemberRoutes (memberRoutes: FastifyTypeBox): Promise<void> {
  memberRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        body: Type.Object({
          userId: Type.String(),
          scopes: Type.Array(Type.String())
        })
      },
      preValidation: [userAuthHook, memberRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const { userId, scopes } = request.body
      await addOrUpdateDomainMember(domainId, userId, scopes)
      return await reply.status(204).send()
    }
  )

  memberRoutes.delete(
    '/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() })
      },
      preValidation: [userAuthHook, memberRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      await removeDomainMember(domainId, userId)
      return await reply.status(204).send()
    }
  )

  memberRoutes.put(
    '/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
        body: Type.Object({
          scopes: Type.Array(Type.String())
        }),
        response: { 200: Type.Object({ modified: Type.Boolean() }) }
      },
      preValidation: [userAuthHook, memberRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      const { scopes } = request.body
      const { modified } = await addOrUpdateDomainMember(domainId, userId, scopes)
      return await reply.status(200).send({ modified })
    }
  )
}

async function domainProblemRoutes (problemRoutes: FastifyTypeBox): Promise<void> {
  problemRoutes.post(
    '/',
    {
      schema: {
        body: NewProblemSchema,
        params: Type.Object({ domainId: Type.String() }),
        response: {
          201: Type.Object({ problemId: Type.String() })
        }
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const problem = request.body
      const { domainId } = request.params
      const created = await createInProblemBank(problem, domainId)
      return await reply.status(201).send(created)
    }
  )

  problemRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema)
        },
        params: Type.Object({ domainId: Type.String() })
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const problems = await fetchDomainProblems(domainId)
      return await reply.status(200).send(problems)
    }
  )

  problemRoutes.put(
    '/:problemId',
    {
      schema: {
        body: Type.Partial(NewProblemSchema),
        response: { 200: Type.Object({ modified: Type.Boolean() }) },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]

    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = request.body
      const { modified } = await updateInProblemBank(problemId, domainId, problem)
      return await reply.status(200).send({ modified })
    }
  )

  problemRoutes.delete(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      await deleteInProblemBank(problemId, domainId)
      return await reply.status(204).send()
    }
  )

  problemRoutes.get(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: { 200: ProblemSchema }
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.read'])]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = await fetchFromProblemBank(problemId, domainId)
      return await reply.status(200).send(problem)
    }
  )

  problemRoutes.post(
    '/:problemId/submissions',
    {
      schema: {
        body: NewSubmissionSchema,
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          202: Type.Object({ submissionId: Type.String() })
        }
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const submission = request.body
      const { domainId, problemId } = request.params
      const problem = await fetchFromProblemBank(problemId, domainId)
      if (problem.testcases == null) {
        return reply.methodNotAllowed('Testcases must be uploaded before a problem can be tested.')
      }
      const created = await createTestingSubmission(submission, problem.domainId, problem.id, (request.auth as AuthenticationProfile).id)
      await queueSubmission(created.submissionId)
      return await reply.status(202).send(created)
    }
  )

  problemRoutes.get(
    '/:problemId/upload-credential',
    {
      schema: {
        response: {
          200: Type.Object({ uploadId: Type.String() })
        },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      preValidation: [userAuthHook, problemRoutes.auth([verifyDomainScope(['problemBank.manage'])]) as any]
    },
    async (request, reply) => {
      const { domainId, problemId } = request.params
      const { uploadId } = await createUploadSession(problemId, domainId)
      await reply.status(200).send({ uploadId })
    }
  )
}

async function domainSubmissionRoutes (submissionRoutes: FastifyTypeBox): Promise<void> {
  submissionRoutes.get(
    '/:submissionId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), submissionId: Type.String() }),
        response: {
          200: Type.Union([TestingSubmissionSchema, ContestSubmissionSchema])
        }
      },
      preValidation: [userAuthHook, submissionRoutes.auth([verifyDomainScope(['problemBank.test'])]) as any]
    },
    async (request, reply) => {
      const { domainId, submissionId } = request.params
      const submission = await fetchSubmission(submissionId)

      if (submission.type !== SubmissionType.Testing || submission.domainId !== domainId) {
        return reply.notFound('No submission found with the given ID.')
      }

      return await reply.status(200).send(submission)
    })
}

export async function domainRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.post(
    '/',
    {
      schema: {
        body: NewDomainSchema,
        response: {
          201: Type.Object({ domainId: Type.String() })
        }
      },
      preValidation: [userAuthHook, routes.auth([verifySuperAdmin]) as any]
    },
    async (request, reply) => {
      const newDomain = request.body
      const { domainId } = await createDomain(newDomain)
      return await reply.status(201).send({ domainId })
    }
  )

  await routes.register(domainManagementRoutes, { prefix: '/:domainId' })
  await routes.register(domainMemberRoutes, { prefix: '/:domainId/members' })
  await routes.register(domainProblemRoutes, { prefix: '/:domainId/problems' })
  await routes.register(domainSubmissionRoutes, { prefix: '/:domainId/submissions' })
}
