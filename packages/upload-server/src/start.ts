import { fastify } from 'fastify'
import fastifyJwt from '@fastify/jwt'

import fastifyHttpErrorsEnhanced from 'fastify-http-errors-enhanced'
import fastifyAuth from '@fastify/auth'

import { testcaseRoutes } from './routes/testcase.routes.js'
import { heartbeatRoutes } from './routes/heartbeat.routes.js'

import { connectMinIO, sentry } from '@argoncs/common'

import fastifySensible from '@fastify/sensible'
import assert from 'assert'

const app = fastify({
  logger: {
    enabled: true
  }
})

sentry.init({
  dsn: 'https://5fe68d06e15e4b979262554199e83b18@o1044666.ingest.sentry.io/4505311047319552',
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version
})

export async function startUploadServer (): Promise<void> {
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
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? ''
  })
  await app.register(fastifyAuth)
  await app.register(fastifySensible)

  await app.register(testcaseRoutes, { prefix: '/testcases' })
  await app.register(heartbeatRoutes, { prefix: '/heartbeat' })

  try {
    const port: number = parseInt(process.env.UPLOAD_SERVER_PORT ?? '8001')
    await app.listen({ port })
  } catch (err) {
    sentry.captureException(err)
    app.log.error(err)
    throw err
  }
}
