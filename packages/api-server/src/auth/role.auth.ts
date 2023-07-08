import { UserRole } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { userAuthHook } from '../hooks/authentication.hooks.js'

export async function verifySuperAdmin (request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.auth == null) {
    await userAuthHook(request, reply)
    if (request.auth == null) {
      throw new ForbiddenError('User not logged in')
    }
  }

  if (request.auth.role !== UserRole.Admin) {
    throw new ForbiddenError('User needs admin privilege to perform this action')
  }
}
