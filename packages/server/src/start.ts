import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { ajvTypeBoxPlugin, TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { problemsRoutes } from './routes/problems.route'
import { testcasesRoutes } from './routes/testcases.route'
import { heartbeatRoutes } from './routes/heartbeat.route'
import { submissionsRoutes } from './routes/submissions.route'

import { cosmosDB } from '@chenhongqiao/carbon-common'

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

export async function startServer (): Promise<void> {
  await cosmosDB.containers.createIfNotExists({ id: 'problems' })
  await cosmosDB.containers.createIfNotExists({ id: 'submissions' })
  await cosmosDB.containers.createIfNotExists({ id: 'users' })

  app.setErrorHandler((err, request, reply) => {
    Sentry.captureException(err)
    app.log.error(err)
    void reply.status(500).send({ message: 'Server error.' })
  })
  await app.register(multipart, {
    prefix: '/testcases',
    limits: {
      fileSize: 20971520
    }
  })
  await app.register(problemsRoutes, { prefix: '/problems' })
  await app.register(testcasesRoutes, { prefix: '/testcases' })
  await app.register(submissionsRoutes, { prefix: '/submissions' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })

  try {
    const port: number = parseInt(process.env.SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
