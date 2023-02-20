import Fastify from 'fastify'
import jwt from '@fastify/jwt'

import { problemBankRoutes } from './routes/problemBank.routes'
import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'
import { submissionResultRoutes } from './routes/submissionResult.routes'
import { authenticationRoutes } from './routes/authentication.routes'
import { domainPublicRoutes, domainPrivateRoutes } from './routes/domain.routes'
import { userRoutes } from './routes/user.routes'
import { judgerRoutes } from './routes/judger.routes'

import { createCollectionIndexes } from './utils/collection.utils'
import { Sentry } from './connections/sentry.connections'

import fastifyAuth from '@fastify/auth'
import sensible from '@fastify/sensible'

const app = Fastify({
  logger: {
    enabled: true
  }
})

export async function startAPIServer (): Promise<void> {
  await createCollectionIndexes()

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? ''
  })

  await app.register(sensible)

  await app.register(fastifyAuth)

  await app.register(problemBankRoutes, { prefix: '/problem-bank' })
  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(submissionResultRoutes, { prefix: '/submission-results' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })
  await app.register(authenticationRoutes, { prefix: '/authentication' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(domainPublicRoutes, { prefix: '/domains' })
  await app.register(domainPrivateRoutes, { prefix: '/domains' })
  await app.register(judgerRoutes, { prefix: '/judger' })

  try {
    const port: number = parseInt(process.env.API_SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err, { extra: err.context })
    app.log.error(err)
    throw err
  }
}
