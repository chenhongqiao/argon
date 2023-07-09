import { fetchContestProblem } from '@argoncs/common'
import { ContestProblemListSchema, ContestSchema, ContestProblemSchema, NewTeamSchema, TeamMembersSchema, NewSubmissionSchema, SubmissionSchema, TeamScoreSchema } from '@argoncs/types'
import { Type } from '@sinclair/typebox'
import { UnauthorizedError, badRequestSchema, conflictSchema, forbiddenSchema, methodNotAllowedSchema, notFoundSchema, unauthorizedSchema } from 'http-errors-enhanced'
import { verifyContestBegan, verifyContestNotBegan, verifyContestPublished, verifyContestRegistration, verifyContestRunning } from '../../auth/contest.auth.js'
import { verifyDomainScope } from '../../auth/scope.auth.js'
import { fetchContest, fetchContestProblemList, fetchContestRanklist, removeProblemFromContest, syncProblemToContest } from '../../services/contest.services.js'
import { FastifyTypeBox } from '../../types.js'
import { completeTeamInvitation, createTeam, createTeamInvitation, deleteTeam, fetchTeamMembers, makeTeamCaptain, removeTeamMember } from '../../services/team.services.js'
import { verifyTeamCaptain, verifyTeamMembership } from '../../auth/team.auth.js'
import { createContestSubmission, fetchContestProblemSubmissions, fetchContestTeamSubmissions } from '../../services/submission.services.js'

async function contestProblemRoutes (problemRoutes: FastifyTypeBox): Promise<void> {
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
      onRequest: [problemRoutes.auth([
        [verifyContestRegistration, verifyContestBegan],
        verifyDomainScope(['contest.read'])]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const problemList = await fetchContestProblemList(contestId)
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
      onRequest: [problemRoutes.auth([
        [verifyContestRegistration, verifyContestBegan],
        verifyDomainScope(['contest.read'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const problem = await fetchContestProblem(problemId, contestId)
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
      onRequest: [problemRoutes.auth([verifyDomainScope(['contest.manage'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      const result = await syncProblemToContest(contestId, problemId)
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
      onRequest: [problemRoutes.auth([verifyDomainScope(['contest.manage'])]) as any]
    },
    async (request, reply) => {
      const { contestId, problemId } = request.params
      await removeProblemFromContest(contestId, problemId)
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
      onRequest: [problemRoutes.auth([verifyDomainScope(['contest.test']), // Testers
        [verifyContestRunning, verifyContestRegistration]]) as any // Users
      ]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }
      const submission = request.body
      const { contestId, problemId } = request.params
      const created = await createContestSubmission(submission, problemId, (request.auth).id, contestId, request.auth.teams[contestId])
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
      onRequest: [problemRoutes.auth([
        verifyDomainScope(['contest.manage']),
        [verifyContestRegistration, verifyContestBegan]
      ]) as any]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const { contestId, problemId } = request.params
      const submissions = await fetchContestProblemSubmissions(contestId, problemId, request.auth.teams[contestId])
      return await reply.status(200).send(submissions)
    }
  )
}

async function contestTeamRoutes (teamRoutes: FastifyTypeBox): Promise<void> {
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
      onRequest: [teamRoutes.auth([verifyContestPublished, verifyContestNotBegan], { relation: 'and' }) as any]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const newTeam = request.body
      const { contestId } = request.params
      const result = await createTeam(newTeam, contestId, request.auth.id)
      return await reply.status(201).send(result)
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
      onRequest: [teamRoutes.auth([verifyContestPublished, verifyContestNotBegan, verifyTeamCaptain], { relation: 'and' }) as any]
    },
    async (request, reply) => {
      const { teamId, contestId } = request.params
      await deleteTeam(teamId, contestId)

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
      onRequest: [teamRoutes.auth([verifyContestPublished, verifyContestNotBegan, verifyTeamCaptain], { relation: 'and' }) as any]
    },
    async (request, reply) => {
      const { userId } = request.body
      const { teamId, contestId } = request.params
      await createTeamInvitation(teamId, contestId, userId)

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
      onRequest: [teamRoutes.auth([verifyContestPublished, verifyContestNotBegan], { relation: 'and' }) as any]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const { invitationId } = request.params
      await completeTeamInvitation(invitationId, request.auth.id)

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
      const members = await fetchTeamMembers(teamId, contestId)
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
      onRequest: [teamRoutes.auth([verifyTeamCaptain]) as any]
    },
    async (request, reply) => {
      const { contestId, teamId, userId } = request.params
      await removeTeamMember(teamId, contestId, userId)
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
      onRequest: [teamRoutes.auth([verifyTeamCaptain]) as any]
    },
    async (request, reply) => {
      const { contestId, teamId } = request.params
      const { userId } = request.body
      const result = await makeTeamCaptain(teamId, contestId, userId)
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
      onRequest: [teamRoutes.auth([
        [verifyTeamMembership, verifyContestBegan]
      ]) as any]
    },
    async (request, reply) => {
      if (request.auth == null) {
        throw new UnauthorizedError('User not logged in')
      }

      const { contestId, teamId } = request.params
      const submissions = await fetchContestTeamSubmissions(contestId, teamId)
      return await reply.status(200).send(submissions)
    }
  )
}

async function contestRanklistRoutes (ranklistRoutes: FastifyTypeBox): Promise<void> {
  ranklistRoutes.get(
    '/',
    {
      schema: {
        params: Type.Object({ contestId: Type.String() }),
        response: {
          200: Type.Array(TeamScoreSchema),
          400: badRequestSchema
        }
      }
    },
    async (request, reply) => {
      const { contestId } = request.params
      const ranklist = await fetchContestRanklist(contestId)
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
          404: notFoundSchema
        }
      },
      onRequest: [routes.auth([verifyDomainScope(['contest.read']), verifyContestPublished]) as any]
    },
    async (request, reply) => {
      const { contestId } = request.params
      const contest = fetchContest(contestId)
      return await reply.status(200).send(contest)
    })

  await routes.register(contestProblemRoutes, { prefix: '/:contestId/problems' })
  await routes.register(contestTeamRoutes, { prefix: '/:contestId/teams' })
  await routes.register(contestRanklistRoutes, { prefix: '/:contestId/ranklist' })
}
