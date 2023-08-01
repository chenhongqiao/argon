import { type FastifyRequest, type FastifyReply } from 'fastify'
import { fetchContestByHandle, fetchContestById } from '../services/contest.services.js'
import { requestParameter } from '../utils/auth.utils.js'


/*
 * Injects `domainId` and `contestId` into request parameters.
 * - Request.params must have either contest ID or handle.
 */
export async function contestInfoHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const contestId = requestParameter(request, 'contestId')
  try {
    requestParameter(request, 'domainId')
    if (contestId.length !== 21) {
      throw new Error('Need to fetch')
    }
  } catch {
    const contest = contestId.length === 21 ? await fetchContestById({ contestId }) : await fetchContestByHandle({ handle: contestId })
    // @ts-expect-error property will be checked later
    request.params.domainId = contest.domainId
    // @ts-expect-error property will be checked later
    request.params.contestId = contest.id
  }
}
