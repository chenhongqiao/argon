import { type FastifyRequest, type FastifyReply } from 'fastify'
import { fetchContestById } from '../services/contest.services.js'
import { requestParameter } from '../utils/auth.utils.js'

export async function contestInfoHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    requestParameter(request, 'domainId')
  } catch {
    const contestId = requestParameter(request, 'contestId')
    const contest = await fetchContestById({ contestId })
    // @ts-expect-error property will be checked later
    request.params.domainId = contest.domainId
  }
}
