import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, PrivateUserProfile } from '@argoncs/types'
import { fetchUser } from '../services/user.services'
import { verifyUserOwnsership } from '../auth/userOwnership.auth'

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
      const { username, name, id } = await fetchUser(userId)
      const publicProfile: PublicUserProfile = { username, name, id }
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
      const { username, name, email, verifiedEmail, scopes, role } = await fetchUser(userId)
      const privateProfile: PrivateUserProfile = { username, name, email, verifiedEmail, scopes, id: userId, role }
      await reply.status(200).send(privateProfile)
    }
  )

  return done()
}
