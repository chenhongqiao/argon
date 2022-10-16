import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { ConflictError, NewDomainSchema, NotFoundError } from '@project-carbon/shared'
import { addDomainMember, createDomain, deleteDomain, removeDomainMember, updateMemberScopes } from '../services/domain.services'
import { verifySuperAdmin } from '../auth/verifySuperAdmin'
import { verifyDomainScope } from '../auth/verifyDomainScope'

export const domainRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send('Please login first.')
    }
  })

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

  privateRoutes.delete(
    '/:domainId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          404: Type.Object({ message: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      await deleteDomain(domainId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Domain not found.' })
        } else {
          throw err
        }
      })
      return await reply.status(204).send()
    }
  )

  privateRoutes.post(
    '/:domainId/members',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: Type.Object({ userId: Type.String(), domainId: Type.String() }),
          404: Type.Object({ message: Type.String() }),
          409: Type.Object({ message: Type.String() })
        },
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
      const added = await addDomainMember(domainId, userId, scopes).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: err.message })
        } else if (err instanceof ConflictError) {
          return await reply.status(409).send({ message: 'User already exists in this domain.' })
        } else {
          throw err
        }
      })
      return await reply.status(200).send(added)
    }
  )

  privateRoutes.delete(
    '/:domainId/members/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
        response: {
          404: Type.Object({ message: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      await removeDomainMember(domainId, userId).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: err.message })
        } else {
          throw err
        }
      })
      return await reply.status(204).send()
    }
  )

  privateRoutes.put(
    '/:domainId/members/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
        response: {
          200: Type.Object({ userId: Type.String(), domainId: Type.String() }),
          404: Type.Object({ message: Type.String() }),
          409: Type.Object({ message: Type.String() })
        },
        body: Type.Object({
          scopes: Type.Array(Type.String())
        })
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin, verifyDomainScope(['domain.manage'])], { relation: 'or' }) as any]
    },
    async (request, reply) => {
      const { domainId, userId } = request.params
      const { scopes } = request.body
      const updated = await updateMemberScopes(domainId, userId, scopes).catch(async (err) => {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: err.message })
        } else {
          throw err
        }
      })
      return await reply.status(200).send(updated)
    }
  )
}
