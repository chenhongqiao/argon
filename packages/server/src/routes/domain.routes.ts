import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { ConflictError, NewDomainSchema, NotFoundError } from '@cocs/types'
import { addDomainMember, createDomain, deleteDomain, removeDomainMember, updateMemberScopes } from '../services/domain.services'
import { verifySuperAdmin } from '../auth/superAdmin.auth'
import { verifyDomainScope } from '../auth/domainScope.auth'
import { Sentry } from '../connections/sentry.connections'

export const domainRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Authentication is required for domain operations.')
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
      try {
        const { domainId } = await createDomain(newDomain)
        return await reply.status(201).send({ domainId })
      } catch (err) {
        Sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred when creating a domain.')
      }
    }
  )

  privateRoutes.delete(
    '/:domainId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() })
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin]) as any]
    },
    async (request, reply) => {
      const { domainId } = request.params
      try {
        await deleteDomain(domainId)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound(err.message)
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when deleting a domain.')
        }
      }
    }
  )

  privateRoutes.post(
    '/:domainId/members',
    {
      schema: {
        params: Type.Object({ domainId: Type.String() }),
        response: {
          200: Type.Object({ userId: Type.String(), domainId: Type.String() })
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
      try {
        const added = await addDomainMember(domainId, userId, scopes)
        return await reply.status(200).send(added)
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound(err.message)
        } else if (err instanceof ConflictError) {
          reply.conflict('User already exists in this domain.')
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when adding domain members.')
        }
      }
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
      try {
        await removeDomainMember(domainId, userId)
        return await reply.status(204).send()
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound(err.message)
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when removing a domain member.')
        }
      }
    }
  )

  privateRoutes.put(
    '/:domainId/members/:userId',
    {
      schema: {
        params: Type.Object({ domainId: Type.String(), userId: Type.String() }),
        response: {
          200: Type.Object({ userId: Type.String(), domainId: Type.String() })
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
      try {
        const updated = await updateMemberScopes(domainId, userId, scopes)
        return await reply.status(200).send(updated)
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.notFound(err.message)
        } else {
          Sentry.captureException(err, { extra: err.context })
          reply.internalServerError('A server error occurred when updating member scopes.')
        }
      }
    }
  )

  return done()
}
