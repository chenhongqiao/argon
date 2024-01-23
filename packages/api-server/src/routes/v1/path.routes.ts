import { Type } from '@sinclair/typebox'
import { type FastifyTypeBox } from '../../types.js'
import { badRequestSchema, forbiddenSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { contestPathInfoHook } from '../../hooks/contest.hooks.js'
import { userAuthHook } from '../../hooks/authentication.hooks.js'
import { contestPublished } from '../../auth/contest.auth.js'
import { hasContestPrivilege, hasDomainPrivilege } from '../../auth/scope.auth.js'
import { contestIdByPath } from '../../services/path.services.js'

async function contestPathRoutes (contestPathRoutes: FastifyTypeBox): Promise<void> {
  contestPathRoutes.get(
    '/:contestPath',
    {
      schema: {
        params: Type.Object({ contestPath: Type.String() }),
        response: {
          200: Type.Object({ contestId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [contestPathInfoHook, contestPathRoutes.auth([
        [userAuthHook, hasDomainPrivilege(['contest.read'])],
        [userAuthHook, hasContestPrivilege(['read'])],
        [contestPublished]
      ]) as any]
    },
    async (request, reply) => {
      const { contestPath } = request.params
      const contestId = await contestIdByPath({ contestPath })
      return await reply.status(200).send({ contestId })
    })
}

export async function pathRoutes (routes: FastifyTypeBox): Promise<void> {
  await routes.register(contestPathRoutes, { prefix: '/contests' })
}
