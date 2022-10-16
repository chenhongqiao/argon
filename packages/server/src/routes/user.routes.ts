import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, PrivateUserProfile } from '@project-carbon/shared'
import { fetchUser } from '../services/user.services'
import { verifyUserOwnsership } from '../auth/verifyUserOwnership'

export const userRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send('Please login first.')
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
      const { username, name } = await fetchUser(userId)
      const publicProfile: PublicUserProfile = { username, name }
      await reply.status(200).send(publicProfile)
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
      const { username, name, email, verifiedEmail, scopes, superAdmin } = await fetchUser(userId)
      const privateProfile: PrivateUserProfile = { username, name, email, verifiedEmail, scopes, id: userId, superAdmin }
      await reply.status(200).send(privateProfile)
    }
  )
}
