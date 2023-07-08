import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, InternalServerError } from 'http-errors-enhanced'
import { userAuthHook } from '../hooks/authentication.hooks.js'
import { contestAnnotateHook } from '../hooks/contest.hooks.js'
import { submissionAnnotateHook } from '../hooks/submission.hooks.js'

export function verifyAnyScope (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    if (request.auth == null) {
      await userAuthHook(request, reply)
      if (request.auth == null) {
        throw new ForbiddenError('User not logged in')
      }
    }

    const allScopes = Object.values(request.auth.scopes).flat(1)

    scopes.forEach((scope) => {
      if (!allScopes.includes(scope)) {
        throw new ForbiddenError('Insufficient user scope')
      }
    })
  }
}

export function verifyDomainScope (scopes: string[]) {
  return async function handler (request: FastifyRequest, reply: FastifyReply) {
    if (request.auth == null) {
      await userAuthHook(request, reply)
      if (request.auth == null) {
        throw new ForbiddenError('User not logged in')
      }
    }

    // @ts-expect-error
    if (request.params.domainId == null && request.params.contestId != null) {
      await contestAnnotateHook(request, reply)
    }

    // @ts-expect-error
    if (request.params.domainId == null && request.params.submissionId != null) {
      await submissionAnnotateHook(request, reply)
    }

    const { domainId } = request.params as { domainId: string | undefined }

    if (domainId == null || typeof domainId !== 'string') {
      throw new InternalServerError('Resource not associated with a domain')
    }

    const userScopes = request.auth.scopes

    scopes.forEach((scope) => {
      if (userScopes[domainId] == null || !Boolean(userScopes[domainId].includes(scope))) {
        throw new ForbiddenError('Insufficient domain scope')
      }
    })
  }
}
