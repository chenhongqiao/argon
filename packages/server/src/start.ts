import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import jwt from '@fastify/jwt'

import { problemBankRoutes } from './routes/problemBank.routes'
import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'
import { submissionResultRoutes } from './routes/submissionResult.routes'
import { authenticationRoutes } from './routes/authentication.routes'
import { domainRoutes } from './routes/domain.routes'
import { userRoutes } from './routes/user.routes'

import { CosmosDB } from '@project-carbon/shared'

import { Sentry } from './connections/sentry.connections'

import fastifyAuth from '@fastify/auth'
import sensible from '@fastify/sensible'

const app = Fastify({
  logger: {
    enabled: true
  }
})

const DbContainers = [
  { id: 'problemBank', partitionKey: '/domainId' },
  { id: 'submissions', partitionKey: '/id' },
  { id: 'domains', partitionKey: '/id' },
  { id: 'users', partitionKey: '/id' },
  { id: 'usernameIndex', partitionKey: '/id' },
  { id: 'emailIndex', partitionKey: '/id' },
  { id: 'emailVerifications', partitionKey: '/userId', defaultTtl: 900 }]

export async function startServer (): Promise<void> {
  const DbInitQueue: Array<Promise<any>> = []
  DbContainers.forEach((container) => {
    DbInitQueue.push(CosmosDB.containers.createIfNotExists(container))
  })
  await Promise.all(DbInitQueue)

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? ''
  })

  await app.register(sensible)

  await app.register(fastifyAuth)

  await app.register(multipart, {
    prefix: '/testcases',
    limits: {
      fileSize: 20971520
    }
  })

  await app.register(problemBankRoutes, { prefix: '/problem-bank' })
  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(submissionResultRoutes, { prefix: '/submission-results' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })
  await app.register(authenticationRoutes, { prefix: '/authentication' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(domainRoutes, { prefix: '/domains' })

  try {
    const port: number = parseInt(process.env.SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
