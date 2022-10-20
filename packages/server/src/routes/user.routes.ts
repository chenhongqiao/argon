import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, PrivateUserProfile } from '@project-carbon/shared'
import { fetchUser } from '../services/user.services'
import { verifyUserOwnsership } from '../auth/userOwnership.auth'
import { Sentry } from '../connections/sentry.connections'

export const userRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.unauthorized('Please authenticate first.')
    }
  })

  privateRoutes.get(
    '/:userId/public-profile',
    {
      schema: {
        response: {
          200: PublicUserProfileSchema
        },
        params: Type.Object({ userId: Type.String() })
      }
    },
    async (request, reply) => {
      const { userId } = request.params
      try {
        const { username, name } = await fetchUser(userId)
        const publicProfile: PublicUserProfile = { username, name }
        await reply.status(200).send(publicProfile)
      } catch (err) {
        Sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred while handling the request.')
      }
    }
  )

  privateRoutes.get(
    '/:userId/private-profile',
    {
      schema: {
        response: {
          200: PrivateUserProfileSchema
        },
        params: Type.Object({ userId: Type.String() })
      },
      preValidation: [privateRoutes.auth([verifyUserOwnsership]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      try {
        const { username, name, email, verifiedEmail, scopes, role } = await fetchUser(userId)
        const privateProfile: PrivateUserProfile = { username, name, email, verifiedEmail, scopes, id: userId, role }
        await reply.status(200).send(privateProfile)
      } catch (err) {
        Sentry.captureException(err, { extra: err.context })
        reply.internalServerError('A server error occurred while handling the request.')
      }
    }
  )

  return done()
}
