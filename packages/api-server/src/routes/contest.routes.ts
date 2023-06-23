import { fetchContestProblem } from '@argoncs/common'
import { ContestProblemListSchema, ContestSchema, ContestProblemSchema } from '@argoncs/types'
import { Type } from '@sinclair/typebox'
import { forbiddenSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { verifyContestBegan, verifyContestPublished, verifyContestRegistration } from '../auth/contest.auth.js'
import { verifyDomainScope } from '../auth/scope.auth.js'
import { userAuthHook } from '../hooks/authentication.hooks.js'
import { fetchContest, fetchContestProblemList, removeProblemFromContest, syncProblemToContest } from '../services/contest.services.js'
import { FastifyTypeBox } from '../types.js'

async function contestProblemRoutes (problemRoutes: FastifyTypeBox): Promise<void> {
  problemRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: ContestProblemListSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        // @ts-expect-error: official documentation allows array in an array (and relation)
        [verifyContestRegistration, verifyContestBegan],
        verifyDomainScope(['contest.read'])]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const problemList = await fetchContestProblemList(contestId)
      return await reply.status(200).send(problemList)
    }
  )

  problemRoutes.get(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          200: ContestProblemSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        // @ts-expect-error: official documentation allows array in an array (and relation)
        [verifyContestRegistration, verifyContestBegan],
        verifyDomainScope(['contest.read'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const problem = await fetchContestProblem(problemId, contestId)
      return await reply.status(200).send(problem)
    }
  )

  problemRoutes.put(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([verifyDomainScope(['contest.manage'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const result = await syncProblemToContest(contestId, problemId)
      return await reply.status(200).send(result)
    }
  )

  problemRoutes.delete(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([verifyDomainScope(['contest.manage'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      await removeProblemFromContest(contestId, problemId)
      return await reply.status(204).send()
    }
  )
}

export async function contestRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.get(
    '/:contestId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: ContestSchema,
          404: notFoundSchema
        }
      },
      onRequest: [routes.auth([verifyContestPublished, verifyDomainScope(['contest.read'])]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const contest = fetchContest(contestId)
      return await reply.status(200).send(contest)
    })

  await routes.register(contestProblemRoutes, { prefix: '/:contestId/problems' })
}
