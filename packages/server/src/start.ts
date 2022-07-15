import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { ajvTypeBoxPlugin, TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { problemRoutes } from './routes/problem.routes'
import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'
import { submissionRoutes } from './routes/submission.routes'
import { userRoutes } from './routes/user.routes'

import { CosmosDB } from '@chenhongqiao/carbon-common'

import { version } from '../package.json'

import Sentry = require('@sentry/node')

Sentry.init({
  dsn: 'https://7e6e404e57024a01819d0fb4cb215538@o1044666.ingest.sentry.io/6554031',
  environment: process.env.NODE_ENV,
  release: version
})

const app = Fastify({
  logger: {
    enabled: true
  },
  ajv: {
    plugins: [ajvTypeBoxPlugin]
  }
}).withTypeProvider<TypeBoxTypeProvider>()

const DBContainers = [
  { id: 'problems', partitionKey: '/id' },
  { id: 'submissions', partitionKey: '/id' },
  { id: 'users', partitionKey: '/id' },
  { id: 'userMappings', partitionKey: '/type' }]

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

  await app.register(multipart, {
    prefix: '/testcases',
    limits: {
      fileSize: 20971520
    }
  })
  await app.register(problemRoutes, { prefix: '/problems' })
  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(submissionRoutes, { prefix: '/submissions' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })
  await app.register(userRoutes, { prefix: '/users' })

  try {
    const port: number = parseInt(process.env.SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
