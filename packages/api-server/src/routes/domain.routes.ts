import { Type } from '@sinclair/typebox'
import { DomainDetailSchema, NewDomainSchema } from '@argoncs/types'
import { addOrUpdateDomainMember, createDomain, fetchDomainDetail, removeDomainMember, updateDomain } from '../services/domain.services.js'
import { verifySuperAdmin } from '../auth/role.auth.js'
import { verifyDomainScope } from '../auth/scope.auth.js'
import { FastifyTypeBox } from '../types.js'
import { authJWTHook } from '../hooks/authentication.hooks.js'

export async function domainRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox) => {
    publicRoutes.get(
      '/:domainId',
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
  })

  await app.register((privateRoutes: FastifyTypeBox) => {
    privateRoutes.addHook('preValidation', authJWTHook)

    privateRoutes.post(
      '/',
      {
        schema: {
          body: NewDomainSchema,
          response: {
            201: Type.Object({ domainId: Type.String() })
          }
        },
        preValidation: [privateRoutes.auth([verifySuperAdmin]) as any]
      },
      async (request, reply) => {
        const newDomain = request.body
        const { domainId } = await createDomain(newDomain)
        return await reply.status(201).send({ domainId })
      }
    )

    privateRoutes.put(
      '/:domainId',
      {
        schema: {
          body: Type.Partial(NewDomainSchema),
          params: Type.Object({ domainId: Type.String() }),
          response: { 200: Type.Object({ modified: Type.Boolean() }) }
        },
        preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
      },
      async (request, reply) => {
        const { domainId } = request.params
        const { modified } = await updateDomain(domainId, request.body)
        return await reply.status(200).send({ modified })
      }
    )

    privateRoutes.post(
      '/:domainId/members',
      {
        schema: {
          params: Type.Object({ domainId: Type.String() }),
          body: Type.Object({
            userId: Type.String(),
            scopes: Type.Array(Type.String())
          })
        },
        preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
      },
      async (request, reply) => {
        const { domainId } = request.params
        const { userId, scopes } = request.body
        await addOrUpdateDomainMember(domainId, userId, scopes)
        return await reply.status(204).send()
      }
    )

    privateRoutes.delete(
      '/:domainId/members/:userId',
      {
        schema: {
          params: Type.Object({ domainId: Type.String(), userId: Type.String() })
        },
        preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
      },
      async (request, reply) => {
        const { domainId, userId } = request.params
        await removeDomainMember(domainId, userId)
        return await reply.status(204).send()
      }
    )

    privateRoutes.put(
      '/:domainId/members/:userId',
      {
        schema: {
          params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
          body: Type.Object({
            scopes: Type.Array(Type.String())
          }),
          response: { 200: Type.Object({ modified: Type.Boolean() }) }
        },
        preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
      },
      async (request, reply) => {
        const { domainId, userId } = request.params
        const { scopes } = request.body
        const { modified } = await addOrUpdateDomainMember(domainId, userId, scopes)
        return await reply.status(200).send({ modified })
      }
    )
  })
}
