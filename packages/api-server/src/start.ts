import { fastify } from 'fastify'

import { problemBankRoutes } from './routes/problemBank.routes.js'
import { testcaseRoutes } from './routes/testcase.routes.js'
import { heartbeatRoutes } from './routes/heartbeat.routes.js'
import { authenticationRoutes } from './routes/authentication.routes.js'
import { domainRoutes } from './routes/domain.routes.js'
import { userRoutes } from './routes/user.routes.js'
import { judgerRoutes } from './routes/judger.routes.js'

import { connectCacheRedis, connectMinIO, connectMongoDB, connectRabbitMQ, sentry } from '@argoncs/common'

import fastifyAuth from '@fastify/auth'
import fastifyCookie from '@fastify/cookie'
import fastifySensible from '@fastify/sensible'
import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'
import assert from 'assert'

const app = fastify({
  logger: {
    enabled: true
  }
})

sentry.init({
  dsn: 'https://5aec7cfe257348109da4882fbb807e3a@o1044666.ingest.sentry.io/4505310995218432',
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version
})

export async function startAPIServer (): Promise<void> {
  assert(process.env.MONGO_URL != null)
  await connectMongoDB(process.env.MONGO_URL)
  assert(process.env.RABBITMQ_URL != null)
  await connectRabbitMQ(process.env.RABBITMQ_URL)
  assert(process.env.CACHEREDIS_URL != null)
  await connectCacheRedis(process.env.CACHEREDIS_URL)
  assert(process.env.MINIO_URL != null)
  await connectMinIO(process.env.MINIO_URL)

  await app.register(fastifyHttpErrorsEnhanced, {
    handle404Errors: false,
    convertResponsesValidationErrors: false,
    preHandler (err: any) {
      if (!('statusCode' in err) && !('validation' in err)) {
        sentry.captureException(err)
      }
      return err
    }
  })
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? ''
  })
  await app.register(fastifySensible)
  await app.register(fastifyAuth)

  await app.register(problemBankRoutes, { prefix: '/problem-bank' })
  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })
  await app.register(authenticationRoutes, { prefix: '/authentication' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(domainRoutes, { prefix: '/domains' })
  await app.register(judgerRoutes, { prefix: '/judger' })

  try {
    const port: number = parseInt(process.env.API_SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
