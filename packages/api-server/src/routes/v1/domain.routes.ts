import { Type } from '@sinclair/typebox'
import { ContestSchema, NewContestSchema, NewDomainSchema, NewProblemSchema, NewSubmissionSchema, ProblemSchema, DomainMembersSchema, DomainSchema, NewContestSeriesSchema } from '@argoncs/types'
import { addOrUpdateDomainMember, createDomain, fetchDomain, fetchDomainMembers, removeDomainMember, updateDomain } from '../../services/domain.services.js'
import { isSuperAdmin } from '../../auth/role.auth.js'
import { hasDomainPrivilege } from '../../auth/scope.auth.js'
import { type FastifyTypeBox } from '../../types.js'
import { createDomainProblem, deleteDomainProblem, fetchDomainProblems, updateDomainProblem } from '../../services/problem.services.js'
import { fetchDomainProblem } from '@argoncs/common'
import { createTestingSubmission } from '../../services/submission.services.js'
import { createUploadSession } from '../../services/testcase.services.js'
import { UnauthorizedError, badRequestSchema, forbiddenSchema, methodNotAllowedSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { createContest, createContestSeries, fetchDomainContestSeries, fetchDomainContests } from '../../services/contest.services.js'
import { userAuthHook } from '../../hooks/authentication.hooks.js'

async function domainMemberRoutes (memberRoutes: FastifyTypeBox): Promise<void> {
  memberRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        body: Type.Object({
          userId: Type.String(),
          scopes: Type.Array(Type.String())
        }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, memberRoutes.auth([
        [isSuperAdmin],
        [hasDomainPrivilege(['domain.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const { userId, scopes } = request.body
      await addOrUpdateDomainMember({ domainId, userId, scopes })
      return await reply.status(204).send()
    }
  )

  memberRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: DomainMembersSchema,
          400: badRequestSchema,
          404: notFoundSchema
        }
      }
    },
    async (request, reply) => {
      const { domainId } = request.params
      const members = await fetchDomainMembers({ domainId })
      return members
    }
  )

  memberRoutes.delete(
    '/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, memberRoutes.auth([
        [isSuperAdmin],
        [hasDomainPrivilege(['domain.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      await removeDomainMember({ domainId, userId })
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
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, memberRoutes.auth([
        [isSuperAdmin],
        [hasDomainPrivilege(['domain.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      const { scopes } = request.body
      const { modified } = await addOrUpdateDomainMember({ domainId, userId, scopes })
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
          201: Type.Object({ problemId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const problem = request.body
      const { domainId } = request.params
      const created = await createDomainProblem({ newProblem: problem, domainId })
      return await reply.status(201).send(created)
    }
  )

  problemRoutes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        },
        params: Type.Object({ domainId: Type.String() })
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.read'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const problems = await fetchDomainProblems({ domainId })
      return await reply.status(200).send(problems)
    }
  )

  problemRoutes.put(
    '/:problemId',
    {
      schema: {
        body: NewProblemSchema,
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.manage'])]
      ]) as any]

    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = request.body
      const { modified } = await updateDomainProblem({ problemId, domainId, problem })
      return await reply.status(200).send({ modified })
    }
  )

  problemRoutes.delete(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      await deleteDomainProblem({ problemId, domainId })
      return await reply.status(204).send()
    }
  )

  problemRoutes.get(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() }),
        response: {
          200: ProblemSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.read'])]
      ]) as any]
    },
    async (request, reply) => {
      const { problemId, domainId } = request.params
      const problem = await fetchDomainProblem({ problemId, domainId })
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
          202: Type.Object({ submissionId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema,
          405: methodNotAllowedSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.test'])]
      ]) as any]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const submission = request.body
      const { domainId, problemId } = request.params
      const created = await createTestingSubmission({ submission, problemId, userId: request.auth.id, domainId })
      return await reply.status(202).send(created)
    }
  )

  problemRoutes.get(
    '/:problemId/upload-session',
    {
      schema: {
        response: {
          200: Type.Object({ uploadId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        },
        params: Type.Object({ domainId: Type.String(), problemId: Type.String() })
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['problem.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId, problemId } = request.params
      const { uploadId } = await createUploadSession({ problemId, domainId })
      await reply.status(200).send({ uploadId })
    }
  )
}

async function domainContestRoutes (contestRoutes: FastifyTypeBox): Promise<void> {
  contestRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        body: NewContestSchema,
        response: {
          201: Type.Object({ contestId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, contestRoutes.auth([
        [hasDomainPrivilege(['contest.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const newContest = request.body
      const { domainId } = request.params
      const result = await createContest({ newContest, domainId })
      return await reply.status(201).send(result)
    }
  )

  contestRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: Type.Array(ContestSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, contestRoutes.auth([
        [hasDomainPrivilege(['contest.read'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const contests = await fetchDomainContests({ domainId })
      return await reply.status(200).send(contests)
    }
  )
}

async function domainContestSeriesRoutes (seriesRoutes: FastifyTypeBox): Promise<void> {
  seriesRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        body: NewContestSeriesSchema,
        response: {
          201: Type.Object({ seriesId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, seriesRoutes.auth([
        [hasDomainPrivilege(['contest.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const newContestSeries = request.body
      const { domainId } = request.params
      const result = await createContestSeries({ newContestSeries, domainId })
      return await reply.status(201).send(result)
    }
  )

  seriesRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: Type.Array(ContestSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      }
    },
    async (request, reply) => {
      const { domainId } = request.params
      const contestSeries = await fetchDomainContestSeries({ domainId })
      return await reply.status(200).send(contestSeries)
    }
  )
}

export async function domainRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.post(
    '/',
    {
      schema: {
        body: NewDomainSchema,
        response: {
          201: Type.Object({ domainId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, routes.auth(
        [isSuperAdmin]
      ) as any]
    },
    async (request, reply) => {
      const newDomain = request.body
      const { domainId } = await createDomain({ newDomain })
      return await reply.status(201).send({ domainId })
    }
  )

  routes.get(
    '/:domainId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: DomainSchema,
          400: badRequestSchema,
          404: notFoundSchema
        }
      }
    },
    async (request, reply) => {
      const { domainId } = request.params
      const domain = await fetchDomain({ domainId })
      return domain
    })

  routes.put(
    '/:domainId',
    {
      schema: {
        body: NewDomainSchema,
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, routes.auth([
        [isSuperAdmin],
        [hasDomainPrivilege(['domain.manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      const { modified } = await updateDomain({ domainId, domain: request.body })
      return await reply.status(200).send({ modified })
    }
  )

  await routes.register(domainMemberRoutes, { prefix: '/:domainId/members' })
  await routes.register(domainProblemRoutes, { prefix: '/:domainId/problems' })
  await routes.register(domainContestRoutes, { prefix: '/:domainId/contests' })
  await routes.register(domainContestSeriesRoutes, { prefix: '/:domainId/contest-series' })
}
