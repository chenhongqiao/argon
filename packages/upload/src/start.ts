import Fastify from 'fastify'
import jwt from '@fastify/jwt'

import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'

import { Sentry } from './connections/sentry.connections'

import sensible from '@fastify/sensible'

const app = Fastify({
  logger: {
    enabled: true
  }
})

export async function startServer (): Promise<void> {
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? ''
  })

  await app.register(sensible)

  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })

  try {
    const port: number = parseInt(process.env.UPLOAD_SERVER_PORT ?? '8001')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err, { extra: err.context })
    app.log.error(err)
    throw err
  }
}
