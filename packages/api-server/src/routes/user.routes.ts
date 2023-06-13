import { Type } from '@sinclair/typebox'
import { PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, PrivateUserProfile } from '@argoncs/types'
import { fetchUser } from '../services/user.services.js'
import { verifyUserOwnsership } from '../auth/ownership.auth.js'
import { FastifyTypeBox } from '../types.js'
import { authJWTHook } from '../hooks/authentication.hooks.js'

export async function userRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((privateRoutes: FastifyTypeBox, options, done) => {
    privateRoutes.addHook('preValidation', authJWTHook)

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
        const { username, name, email, newEmail, scopes, role } = await fetchUser(userId)
        const privateProfile: PrivateUserProfile = { username, name, email, newEmail, scopes, id: userId, role }
        await reply.status(200).send(privateProfile)
      }
    )

    done()
  })
}
