import { Type } from '@sinclair/typebox'
import { type FastifyTypeBox } from '../../types.js'
import {
  ContestProblemListSchema,
  ContestSchema,
  ContestProblemSchema,
  NewTeamSchema,
  TeamMembersSchema,
  NewSubmissionSchema,
  SubmissionSchema,
  TeamScoreSchema,
  NewContestSchema,
  ContestSeriesSchema,
  TeamSchema,
  TeamInvitationSchema
} from '@argoncs/types'
import { fetchContestProblem } from '@argoncs/common'
import {
  UnauthorizedError,
  badRequestSchema,
  conflictSchema,
  forbiddenSchema,
  methodNotAllowedSchema,
  notFoundSchema,
  unauthorizedSchema
} from 'http-errors-enhanced'
import {
  contestBegan,
  contestNotBegan,
  contestPublished,
  registeredForContest,
  contestRunning
} from '../../auth/contest.auth.js'
import {
  hasContestPrivilege,
  hasDomainPrivilege,
  hasNoPrivilege
} from '../../auth/scope.auth.js'
import {
  fetchAllContestSeries,
  fetchContest,
  fetchContestProblemList,
  fetchContestRanklist,
  removeProblemFromContest,
  syncProblemToContest,
  updateContest,
  publishContest
} from '../../services/contest.services.js'
import {
  completeTeamInvitation,
  createTeam,
  createTeamInvitation,
  deleteTeam,
  deleteTeamInvitation,
  fetchTeam,
  fetchTeamInvitations,
  fetchTeamMembers,
  makeTeamCaptain,
  removeTeamMember
} from '../../services/team.services.js'
import { isTeamCaptain, isTeamMember } from '../../auth/team.auth.js'
import { createContestSubmission, querySubmissions } from '../../services/submission.services.js'
import { hasVerifiedEmail } from '../../auth/email.auth.js'
import { userAuthHook } from '../../hooks/authentication.hooks.js'
import { contestInfoHook } from '../../hooks/contest.hooks.js'
import { requestAuthProfile } from '../../utils/auth.utils.js'

async function contestProblemRoutes (problemRoutes: FastifyTypeBox): Promise<void> {
  problemRoutes.addHook('onRequest', contestInfoHook)
  problemRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: ContestProblemListSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.read'])], // Domain scope
        [hasContestPrivilege(['read'])], // Contest privilege
        [registeredForContest, contestBegan] // Regular participant
      ]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const problemList = await fetchContestProblemList({ contestId })
      return await reply.status(200).send(problemList)
    }
  )

  problemRoutes.get(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          200: ContestProblemSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.read'])], // Domain scope
        [hasContestPrivilege(['read'])], // Contest privilege
        [registeredForContest, contestBegan] // Regular participant
      ]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const problem = await fetchContestProblem({ problemId, contestId })
      return await reply.status(200).send(problem)
    }
  )

  problemRoutes.put(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.manage'])],
        [hasContestPrivilege(['manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const result = await syncProblemToContest({ contestId, problemId })
      return await reply.status(200).send(result)
    }
  )

  problemRoutes.delete(
    '/:problemId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.manage'])],
        [hasContestPrivilege(['manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      await removeProblemFromContest({ contestId, problemId })
      return await reply.status(204).send()
    }
  )

  problemRoutes.post(
    '/:problemId/submissions',
    {
      schema: {
        body: NewSubmissionSchema,
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          202: Type.Object({ submissionId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.test'])], // Domain testers
        [hasContestPrivilege(['test'])], // Contest tester
        [contestRunning, registeredForContest]]) as any // Users
      ]
    },
    async (request, reply) => {
      if (request.user == null) {
        throw new UnauthorizedError('User not logged in')
      }
      const submission = request.body
      const { contestId, problemId } = request.params
      const created = await createContestSubmission({ submission, problemId, userId: (request.user).id, contestId, teamId: request.user.teams[contestId] })
      return await reply.status(202).send(created)
    }
  )

  problemRoutes.get(
    '/:problemId/submissions',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), problemId: Type.String() }),
        response: {
          200: Type.Array(SubmissionSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, problemRoutes.auth([
        [hasDomainPrivilege(['contest.test'])],
        [hasContestPrivilege(['test'])],
        [registeredForContest, contestBegan]
      ]) as any]
    },
    async (request, reply) => {
      const auth = requestAuthProfile(request)
      const { contestId, problemId } = request.params

      if (!('domainId' in request.params) || typeof request.params.domainId !== 'string' || !(request.params.domainId in auth.scopes)) {
        // User is a regular participant
        const submissions = await querySubmissions({ query: { contestId, problemId, teamId: auth.teams[contestId] } })
        return await reply.status(200).send(submissions)
      } else {
        if (auth.scopes[request.params.domainId].includes('contest.manage') || auth.scopes[request.params.domainId].includes(`contest-${contestId}.manage`)) {
          // User is an admin with access to all users' submissions
          const submissions = await querySubmissions({ query: { domainId: request.params.domainId, contestId, problemId } })
          return await reply.status(200).send(submissions)
        } else {
          // User is a tester
          const submissions = await querySubmissions({ query: { contestId, problemId, userId: auth.id } })
          return await reply.status(200).send(submissions)
        }
      }
    }
  )
}

async function contestTeamRoutes (teamRoutes: FastifyTypeBox): Promise<void> {
  teamRoutes.addHook('onRequest', contestInfoHook)

  /* Create new team
   * - Sets current user as captain
   */
  teamRoutes.post(
    '/',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        body: NewTeamSchema,
        response: {
          201: Type.Object({ teamId: Type.String() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema,
          409: conflictSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [hasNoPrivilege, contestPublished, contestNotBegan, hasVerifiedEmail]
      ]) as any]
    },
    async (request, reply) => {
      if (request.user == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const newTeam = request.body
      const { contestId } = request.params
      const result = await createTeam({ newTeam, contestId, userId: request.user.id })
      return await reply.status(201).send(result)
    }
  )

  teamRoutes.get(
    '/:teamId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        response: {
          200: TeamSchema,
          400: badRequestSchema,
          404: notFoundSchema
        }
      }
    },
    async (request, reply) => {
      const { contestId, teamId } = request.params
      const team = await fetchTeam({ teamId, contestId })
      return await reply.status(200).send(team)
    }
  )

  teamRoutes.delete(
    '/:teamId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        resposne: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema,
          405: methodNotAllowedSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [contestPublished, isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { teamId, contestId } = request.params
      await deleteTeam({ teamId, contestId })

      return await reply.status(204).send()
    }
  )

  teamRoutes.post(
    '/:teamId/invitations',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        body: Type.Object({ userId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [contestPublished, contestNotBegan, isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { userId } = request.body
      const { teamId, contestId } = request.params
      await createTeamInvitation({ teamId, contestId, userId })

      return await reply.status(204).send()
    }
  )

  teamRoutes.get(
    '/:teamId/invitations',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        response: {
          200: Type.Array(TeamInvitationSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [contestPublished, contestNotBegan, isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { teamId, contestId } = request.params
      const invitations = await fetchTeamInvitations({ teamId, contestId })

      return await reply.status(200).send(invitations)
    }
  )

  teamRoutes.delete(
    '/:teamId/invitations/:invitationId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String(), invitationId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [contestPublished, contestNotBegan, isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { teamId, contestId, invitationId } = request.params
      await deleteTeamInvitation({ teamId, contestId, invitationId })

      return await reply.status(204).send()
    }
  )

  teamRoutes.post(
    '/:teamId/invitations/:invitationId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String(), invitationId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [hasNoPrivilege, contestPublished, contestNotBegan, hasVerifiedEmail]
      ]) as any]
    },
    async (request, reply) => {
      if (request.user == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const { invitationId } = request.params
      await completeTeamInvitation({ invitationId, userId: request.user.id })

      return await reply.status(204).send()
    }
  )

  teamRoutes.get(
    '/:teamId/members',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        response: {
          200: TeamMembersSchema,
          400: badRequestSchema,
          404: notFoundSchema
        }
      }
    },
    async (request, reply) => {
      const { contestId, teamId } = request.params
      const members = await fetchTeamMembers({ teamId, contestId })
      return await reply.status(200).send(members)
    }
  )

  teamRoutes.delete(
    '/:teamId/members/:userId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String(), userId: Type.String() }),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema,
          405: methodNotAllowedSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId, teamId, userId } = request.params
      await removeTeamMember({ teamId, contestId, userId })
      return await reply.status(204).send()
    }
  )

  teamRoutes.put(
    '/:teamId/captain',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        body: Type.Object({ userId: Type.String() }),
        response: {
          200: Type.Object({ modified: Type.Boolean() }),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [isTeamCaptain]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId, teamId } = request.params
      const { userId } = request.body
      const result = await makeTeamCaptain({ teamId, contestId, userId })
      return await reply.status(200).send(result)
    }
  )

  teamRoutes.get(
    '/:teamId/submissions',
    {
      schema: {
        params: Type.Object({ contestId: Type.String(), teamId: Type.String() }),
        response: {
          200: Type.Array(SubmissionSchema),
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema
        }
      },
      onRequest: [userAuthHook, teamRoutes.auth([
        [hasDomainPrivilege(['contest.manage'])],
        [hasContestPrivilege(['manage'])],
        [isTeamMember, contestBegan]
      ]) as any]
    },
    async (request, reply) => {
      if (request.user == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const { contestId, teamId } = request.params
      const submissions = await querySubmissions({ query: { contestId, teamId } })
      return await reply.status(200).send(submissions)
    }
  )
}

async function contestRanklistRoutes (ranklistRoutes: FastifyTypeBox): Promise<void> {
  ranklistRoutes.addHook('onRequest', contestInfoHook)
  ranklistRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: Type.Array(TeamScoreSchema),
          400: badRequestSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [ranklistRoutes.auth([
        [contestBegan]
      ]) as any]
    },

    async (request, reply) => {
      const { contestId } = request.params
      const ranklist = await fetchContestRanklist({ contestId })
      return await reply.status(200).send(ranklist)
    }
  )
}

export async function contestRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.get(
    '/:contestId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: ContestSchema,
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [contestInfoHook, routes.auth([
        [userAuthHook, hasDomainPrivilege(['contest.read'])],
        [userAuthHook, hasContestPrivilege(['read'])],
        [contestPublished]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const contest = await fetchContest({ contestId })
      return await reply.status(200).send(contest)
    })

  routes.put(
    '/:contestId',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        body: Type.Omit(NewContestSchema, ['seriesId']),
        response: {
          400: badRequestSchema,
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [contestInfoHook, userAuthHook, routes.auth([
        [hasDomainPrivilege(['contest.manage'])],
        [hasContestPrivilege(['manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const newContest = request.body
      await updateContest({ contestId, newContest })
      return await reply.status(204).send()
    })

  routes.post(
    '/:contestId/publish',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          401: unauthorizedSchema,
          403: forbiddenSchema,
          404: notFoundSchema
        }
      },
      onRequest: [contestInfoHook, userAuthHook, routes.auth([
        [hasDomainPrivilege(['contest.manage'])],
        [hasContestPrivilege(['manage'])]
      ]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      await publishContest({ contestId, published: true })
      return await reply.status(204).send()
    })

  await routes.register(contestProblemRoutes, { prefix: '/:contestId/problems' })
  await routes.register(contestTeamRoutes, { prefix: '/:contestId/teams' })
  await routes.register(contestRanklistRoutes, { prefix: '/:contestId/ranklist' })
}

export async function contestSeriesRoutes (routes: FastifyTypeBox): Promise<void> {
  routes.get('/',
    {
      schema: {
        response: {
          200: Type.Array(ContestSeriesSchema)
        }
      }
    },
    async (request, reply) => {
      const contestSeries = await fetchAllContestSeries()
      return await reply.status(200).send(contestSeries)
    })
}
