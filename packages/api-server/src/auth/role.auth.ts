import { UserRole } from '@argoncs/types'
import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestAuthProfile } from '../utils/auth.utils.js'

export async function isSuperAdmin (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = requestAuthProfile(request)

  if (auth.role !== UserRole.Admin) {
    throw new ForbiddenError('User needs admin privilege to perform this action')
  }
}
