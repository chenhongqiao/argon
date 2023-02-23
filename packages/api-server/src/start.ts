import Fastify from 'fastify'
import { randomBytes } from 'crypto'
import Sentry = require('@sentry/node')
import { sessionRedis } from '../../common/src'

import { problemBankRoutes } from './routes/problemBank.routes'
import { testcaseRoutes } from './routes/testcase.routes'
import { heartbeatRoutes } from './routes/heartbeat.routes'
import { submissionResultRoutes } from './routes/submissionResult.routes'
import { authenticationRoutes } from './routes/authentication.routes'
import { domainPublicRoutes, domainPrivateRoutes } from './routes/domain.routes'
import { userRoutes } from './routes/user.routes'
import { judgerPublicRoutes, judgerPrivateRoutes } from './routes/judger.routes'

import { createCollectionIndexes } from './utils/collection.utils'

import fastifyAuth from '@fastify/auth'
import fastifyCookie from '@fastify/cookie'
import fastifySession from '@fastify/session'
import fastifySensible from '@fastify/sensible'
import fastifyJwt from '@fastify/jwt'
import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'

import { version } from '../package.json'

import connectRedis from 'connect-redis'
const RedisStore = connectRedis(fastifySession as any)

const app = Fastify({
  logger: {
    enabled: true
  }
})

Sentry.init({
  dsn: 'https://7e6e404e57024a01819d0fb4cb215538@o1044666.ingest.sentry.io/6554031',
  environment: process.env.NODE_ENV,
  release: version
})

export async function startAPIServer (): Promise<void> {
  await createCollectionIndexes()

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? ''
  })
  await app.register(fastifyCookie)
  await app.register(fastifySession, {
    store: new RedisStore({ client: sessionRedis }) as any,
    secret: process.env.COOKIE_SECRET ?? '',
    idGenerator (request: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `${request.session.userId}-${randomBytes(16).toString('hex')}`
    },
    saveUninitialized: false
  })
  await app.register(fastifySensible)
  await app.register(fastifyAuth)
  await app.register(fastifyHttpErrorsEnhanced, {
    handle404Errors: false,
    preHandler (err: any) {
      if (!('statusCode' in err) && !('validation' in err)) {
        Sentry.captureException(err)
      }
      return err
    }
  })

  await app.register(problemBankRoutes, { prefix: '/problem-bank' })
  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(submissionResultRoutes, { prefix: '/submission-results' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })
  await app.register(authenticationRoutes, { prefix: '/authentication' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(domainPublicRoutes, { prefix: '/domains' })
  await app.register(domainPrivateRoutes, { prefix: '/domains' })
  await app.register(judgerPublicRoutes, { prefix: '/judger' })
  await app.register(judgerPrivateRoutes, { prefix: '/judger' })

  try {
    const port: number = parseInt(process.env.API_SERVER_PORT ?? '8000')
    await app.listen({ port })
  } catch (err) {
    Sentry.captureException(err, { extra: err.context })
    app.log.error(err)
    throw err
  }
}
