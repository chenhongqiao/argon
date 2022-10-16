import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import jwt from '@fastify/jwt'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { problemBankRoutes } from './routes/problemBank.routes'
import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'
import { submissionResultRoutes } from './routes/submissionResult.routes'
import { authenticationRoutes } from './routes/authentication.routes'

import { CosmosDB } from '@project-carbon/shared'

import { version } from '../package.json'

import Sentry = require('@sentry/node')
import fastifyAuth from '@fastify/auth'

Sentry.init({
  dsn: 'https://7e6e404e57024a01819d0fb4cb215538@o1044666.ingest.sentry.io/6554031',
  environment: process.env.NODE_ENV,
  release: version
})

const app = Fastify({
  logger: {
    enabled: true
  }
}).withTypeProvider<TypeBoxTypeProvider>()

const DBContainers = [
  { id: 'problemBank', partitionKey: '/domainId' },
  { id: 'submissions', partitionKey: '/id' },
  { id: 'users', partitionKey: '/id' },
  { id: 'usernameIndex', partitionKey: '/id' },
  { id: 'emailIndex', partitionKey: '/id' },
  { id: 'emailVerifications', partitionKey: '/userId', defaultTtl: 900 }]

export async function startServer (): Promise<void> {
  const DBInitQueue: Array<Promise<any>> = []
  DBContainers.forEach((container) => {
    DBInitQueue.push(CosmosDB.containers.createIfNotExists(container))
  })
  await Promise.all(DBInitQueue)

  app.setErrorHandler((err, request, reply) => {
    if (err.statusCode != null && err.statusCode < 500) {
      void reply.status(err.statusCode).send({ message: err.message })
    } else {
      Sentry.captureException(err)
      app.log.error(err)
      void reply.status(500).send({ message: 'Server error.' })
    }
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? ''
  })

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

  try {
    const port: number = parseInt(process.env.SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
