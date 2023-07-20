import { type FastifyRequest, type FastifyReply } from 'fastify'
import { fetchSubmission } from '@argoncs/common'
import { requestParameter } from '../utils/auth.utils.js'

export async function submissionInfoHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    requestParameter(request, 'contestId')
    requestParameter(request, 'teamId')
    requestParameter(request, 'domainId')
  } catch {
    const submissionId = requestParameter(request, 'submissionId')

    const submission = await fetchSubmission({ submissionId })
    // @ts-expect-error property will be checked later
    request.params.contestId = submission.contestId
    // @ts-expect-error property will be checked later
    request.params.teamId = submission.teamId
    // @ts-expect-error property will be checked later
    request.params.domainId = submission.domainId
  }
}
