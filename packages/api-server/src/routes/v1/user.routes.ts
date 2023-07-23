import { Type } from '@sinclair/typebox'
import { type PublicUserProfile, PublicUserProfileSchema, PrivateUserProfileSchema, NewUserSchema, SubmissionSchema } from '@argoncs/types'
import { completeVerification, emailExists, fetchUserById, fetchUserByUsername, initiateVerification, registerUser, searchUsers, userIdExists, usernameExists } from '../../services/user.services.js'
import { ownsResource } from '../../auth/ownership.auth.js'
import { type FastifyTypeBox } from '../../types.js'
import { NotFoundError, badRequestSchema, conflictSchema, forbiddenSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { contestNotBegan, contestPublished } from '../../auth/contest.auth.js'
import { completeTeamInvitation } from '../../services/team.services.js'
import { hasDomainPrivilege, hasNoPrivilege } from '../../auth/scope.auth.js'
import { isTeamMember } from '../../auth/team.auth.js'
import { fetchSubmission } from '@argoncs/common'
import { isSuperAdmin } from '../../auth/role.auth.js'
import { userAuthHook } from '../../hooks/authentication.hooks.js'
import { contestInfoHook } from '../../hooks/contest.hooks.js'
import { submissionInfoHook } from '../../hooks/submission.hooks.js'
import gravatarUrl from 'gravatar-url'

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
      const { username, name, id, email } = (userId.length === 21 ? await fetchUserById({ userId }) : await fetchUserByUsername({ username: userId }))
      const gravatar = email != null ? gravatarUrl(email) : undefined
      const publicProfile: PublicUserProfile = { username, name, id, gravatar }
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
      onRequest: [userAuthHook, profileRoutes.auth([
        [ownsResource],
        [isSuperAdmin]]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      const { username, name, email, newEmail, scopes, role, teams, year, school, country, region, id } = (userId.length === 21 ? await fetchUserById({ userId }) : await fetchUserByUsername({ username: userId }))
      const gravatar = email != null ? gravatarUrl(email) : undefined
      return await reply.status(200).send({ id, username, name, email, newEmail, scopes, role, teams, year, school, country, region, gravatar })
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
      onRequest: [userAuthHook, verificationRoutes.auth([
        [ownsResource]
      ]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      await initiateVerification({ userId })
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
      },
      onRequest: [userAuthHook, verificationRoutes.auth([
        [ownsResource]
      ]) as any]
    },
    async (request, reply) => {
      const { verificationId } = request.params
      const { modified } = await completeVerification({ verificationId })
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
      onRequest: [userAuthHook, contestInfoHook, contestRoutes.auth([[
        hasNoPrivilege, contestPublished, contestNotBegan, ownsResource]
      ]) as any]
    },
    async (request, reply) => {
      const { invitationId, userId } = request.params
      await completeTeamInvitation({ invitationId, userId })

      return await reply.status(204).send()
    }
  )
}

async function userSubmissionRoutes (submissionRoutes: FastifyTypeBox): Promise<void> {
  submissionRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ userId: Type.String() }),
        response: {
          200: Type.Array(SubmissionSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, submissionRoutes.auth([
        [ownsResource],
        [isSuperAdmin]
      ]) as any]
    },
    async (request, reply) => {
      const { userId } = request.params
      const submissions = await fetchUserById({ userId })
      return await reply.status(200).send(submissions)
    }
  )

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
      onRequest: [userAuthHook, submissionInfoHook, submissionRoutes.auth([
        [isTeamMember], // User viewing submissions from other team members
        [hasDomainPrivilege(['problem.manage'])], // Admin viewing all submissions to problems in their domain
        [ownsResource] // User viewing their own submission
      ]) as any]
    },
    async (request, reply) => {
      const { submissionId } = request.params
      const submission = await fetchSubmission({ submissionId })

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
      const registered = await registerUser({ newUser: user })
      return await reply.status(201).send(registered)
    }
  )

  routes.head(
    '/:userId',
    {
      schema: {
        response: {
          400: badRequestSchema,
          404: notFoundSchema
        },
        params: Type.Object({ userId: Type.String() })
      }
    },
    async (request, reply) => {
      const { userId } = request.params
      const exists = userId.includes('@') ? await emailExists({ email: userId }) : (userId.length === 21 ? await userIdExists({ userId }) : await usernameExists({ username: userId }))
      if (exists) {
        await reply.status(200).send()
      } else {
        throw new NotFoundError('User not found')
      }
    }
  )

  routes.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(PublicUserProfileSchema),
          400: badRequestSchema,
          401: unauthorizedSchema
        },
        querystring: Type.Object({
          query: Type.String(),
          noteam: Type.Optional(Type.String())
        })
      },
      onRequest: [userAuthHook]
    },
    async (request, reply) => {
      const { query, noteam } = request.query as { query: string, noteam: undefined | string }
      let users = await searchUsers({ query })
      if (noteam != null) {
        users = users.filter((user) => user.teams[noteam] == null)
      }
      const profiles: PublicUserProfile[] = users.map((user) => {
        const { id, username, name, email } = user
        const gravatar = email != null ? gravatarUrl(email) : undefined
        return { id, username, name, gravatar }
      })
      return await reply.status(200).send(profiles.slice(0, 10))
    }
  )

  await routes.register(userProfileRoutes, { prefix: '/:userId/profiles' })
  await routes.register(userVerificationRoutes, { prefix: '/:userId/email-verifications' })
  await routes.register(userContestRoutes, { prefix: '/:userId/contests' })
  await routes.register(userSubmissionRoutes, { prefix: '/:userId/submissions' })
}
