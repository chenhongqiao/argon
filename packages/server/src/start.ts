import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { ajvTypeBoxPlugin, TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { problemsRoutes } from './routes/problems.route'
import { testcasesRoutes } from './routes/testcases.route'
import { heartbeatRoutes } from './routes/heartbeat.route'
import { submissionsRoutes } from './routes/submissions.route'

import Sentry = require('@sentry/node')

Sentry.init({
  dsn: 'https://7e6e404e57024a01819d0fb4cb215538@o1044666.ingest.sentry.io/6554031'
})

const app = Fastify({
  logger: {
    enabled: true,
    prettyPrint: true
  },
  ajv: {
    plugins: [ajvTypeBoxPlugin]
  }
}).withTypeProvider<TypeBoxTypeProvider>()

export async function startServer (): Promise<void> {
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
    const port: number = parseInt(process.env.SERVER_PORT ?? '3000')
    await app.listen({ port })
    app.log.info(`Server started on port ${port}.`)
  } catch (err) {
    Sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
