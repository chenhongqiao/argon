import { ContestSchema } from '@argoncs/types'
import { Type } from '@sinclair/typebox'
import { notFoundSchema } from 'http-errors-enhanced'
import { verifyContestPublished } from '../auth/contest.auth.js'
import { verifyDomainScope } from '../auth/scope.auth.js'
import { fetchContest } from '../services/contest.services.js'
import { FastifyTypeBox } from '../types.js'

export async function contestRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.get(
    ':/contestId',
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
}
