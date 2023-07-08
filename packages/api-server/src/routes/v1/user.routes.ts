import { Type } from '@sinclair/typebox'
import { PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, PrivateUserProfile, NewUserSchema, SubmissionSchema } from '@argoncs/types'
import { completeVerification, fetchUser, initiateVerification, registerUser } from '../../services/user.services.js'
import { verifyUserOwnership } from '../../auth/ownership.auth.js'
import { FastifyTypeBox } from '../../types.js'
import { badRequestSchema, conflictSchema, forbiddenSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { verifyContestNotBegan, verifyContestPublished } from '../../auth/contest.auth.js'
import { completeTeamInvitation } from '../../services/team.services.js'
import { verifyDomainScope } from '../../auth/scope.auth.js'
import { verifyTeamMembership } from '../../auth/team.auth.js'
import { fetchSubmission } from '@argoncs/common'

async function userProfileRoutes (profileRoutes: FastifyTypeBox): Promise<void> {
  profileRoutes.get(
    '/public',
    {
      schema: {
        response: {
          200: PublicUserProfileSchema,
          400: badRequestSchema,
          404: notFoundSchema
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

  profileRoutes.get(
    '/private',
    {
      schema: {
        response: {
          200: PrivateUserProfileSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        },
        params: Type.Object({ userId: Type.String() })
      },
      onRequest: [profileRoutes.auth([verifyUserOwnership]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      const { username, name, email, newEmail, scopes, role, teams } = await fetchUser(userId)
      const privateProfile: PrivateUserProfile = { username, name, email, newEmail, scopes, id: userId, role, teams }
      await reply.status(200).send(privateProfile)
    }
  )
}

async function userVerificationRoutes (verificationRoutes: FastifyTypeBox): Promise<void> {
  verificationRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [verificationRoutes.auth([verifyUserOwnership]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      await initiateVerification(userId)
      return await reply.status(204).send()
    }
  )

  verificationRoutes.post(
    '/:verificationId',
    {
      schema: {
        params: Type.Object({
          verificationId: Type.String()
        }),
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: notFoundSchema
        }
      }
    },
    async (request, reply) => {
      const { verificationId } = request.params
      const { modified } = await completeVerification(verificationId)
      return await reply.status(200).send({ modified })
    }
  )
}

export async function userContestRoutes (contestRoutes: FastifyTypeBox): Promise<void> {
  contestRoutes.post(
    '/:contestId/invitations/:invitationId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), userId: Type.String(), invitationId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [contestRoutes.auth([verifyContestPublished, verifyContestNotBegan, verifyUserOwnership], { relation: 'and' }) as any]
    },
    async (request, reply) => {
      const { invitationId, userId } = request.params
      await completeTeamInvitation(invitationId, userId)

      return await reply.status(204).send()
    }
  )
}

async function userSubmissionRoutes (submissionRoutes: FastifyTypeBox): Promise<void> {
  submissionRoutes.get(
    '/:submissionId',
    {
      schema: {
        params: Type.Object({ userId: Type.String(), submissionId: Type.String() }),
        response: {
          200: SubmissionSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [submissionRoutes.auth([
        verifyUserOwnership, // User viewing their own submission
        verifyDomainScope(['problem.manage']), // Admin viewing all submissions to problems in their domain
        verifyTeamMembership // User viewing submissions from other team members
      ]) as any]
    },
    async (request, reply) => {
      const { submissionId } = request.params
      const submission = await fetchSubmission(submissionId)

      return await reply.status(200).send(submission)
    })
}

export async function userRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.post(
    '/',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userId: Type.String() }),
          400: badRequestSchema,
          409: conflictSchema
        }
      }
    },
    async (request, reply) => {
      const user = request.body
      const registered = await registerUser(user)
      return await reply.status(201).send(registered)
    }
  )

  await routes.register(userProfileRoutes, { prefix: '/:userId/profile' })
  await routes.register(userVerificationRoutes, { prefix: '/:userId/email-verification' })
  await routes.register(userContestRoutes, { prefix: '/:userId/contests' })
  await routes.register(userSubmissionRoutes, { prefix: '/:userId/submissions' })
}
