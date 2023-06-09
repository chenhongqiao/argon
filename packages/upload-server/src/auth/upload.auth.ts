import { JWTPayloadType } from '@argoncs/types'
import { FastifyReply, FastifyRequest } from 'fastify'
import { ForbiddenError, UnauthorizedError } from 'http-errors-enhanced'

export function verifyTestcaseUpload (request: FastifyRequest, reply: FastifyReply, done): void {
  if (request.user.type !== JWTPayloadType.Upload) {
    return done(new UnauthorizedError('JWT token must be valid for testcase upload.'))
  }

  // @ts-expect-error: url of problems always includes domainId as a parameter.
  const domainId = request.params.domainId
  // @ts-expect-error: url of problems always includes problemID as a parameter.
  const problemId = request.params.problemId
  if (domainId == null || typeof domainId !== 'string' || problemId == null || typeof problemId !== 'string') {
    return done(new ForbiddenError('Resource not associated with a domain and a problem.'))
  }

  if (request.user.resource.domainId !== domainId || request.user.resource.problemId !== problemId) {
    return done(new ForbiddenError('Token does not authorize upload to this resource.'))
  }

  done()
}
