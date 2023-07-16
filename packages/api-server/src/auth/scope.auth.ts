import { type FastifyReply, type FastifyRequest } from 'fastify'
import { ForbiddenError } from 'http-errors-enhanced'
import { requestAuthProfile, requestParameter } from '../utils/auth.utils.js'

export function verifyAnyScope (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    const auth = requestAuthProfile(request)

    const allScopes = Object.values(auth.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        throw new ForbiddenError('Insufficient user scope')
      }
    })
  }
}

export function verifyDomainScope (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    const auth = requestAuthProfile(request)

    const domainId = requestParameter(request, 'domainId')
    const userScopes = auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        throw new ForbiddenError('Insufficient domain scope')
      }
    })
  }
}
