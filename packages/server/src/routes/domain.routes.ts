import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { DomainDetailSchema, JWTPayloadType, NewDomainSchema } from '@argoncs/types'
import { addOrUpdateDomainMember, createDomain, fetchDomainDetail, removeDomainMember, updateDomain } from '../services/domain.services'
import { verifySuperAdmin } from '../auth/superAdmin.auth'
import { verifyDomainScope } from '../auth/domainScope.auth'

export const domainPublicRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.get(
    '/:domainId',
    {
      schema: {
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) }),
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
  return done()
}

export const domainPrivateRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    await request.jwtVerify()
    if (request.user.type !== JWTPayloadType.Identification) {
      return reply.unauthorized('JWT Token must be valid for identification.')
    }
  })

  privateRoutes.post(
    '/',
    {
      schema: {
        body: NewDomainSchema,
        response: {
          201: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) })
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
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) }),
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
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i) }),
        body: Type.Object({
          userId: Type.RegEx(/^[a-f\d]{24}$/i),
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
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), userId: Type.RegEx(/^[a-f\d]{24}$/i) })
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
        params: Type.Object({ domainId: Type.RegEx(/^[a-f\d]{24}$/i), userId: Type.RegEx(/^[a-f\d]{24}$/i) }),
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

  return done()
}
