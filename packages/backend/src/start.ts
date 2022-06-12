import Fastify from 'fastify'
import multipart from '@fastify/multipart'

import { problemsRoutes } from './routes/problems.route'
import { testcasesRoutes } from './routes/testcases.route'

const app = Fastify({ logger: true })

export async function startServer (): Promise<void> {
  await app.register(multipart, {
    prefix: '/testcases',
    limits: {
      fileSize: 20971520
    }
  })
  await app.register(problemsRoutes, { prefix: '/problems' })
  await app.register(testcasesRoutes, { prefix: '/testcases' })

  try {
    await app.listen(3000)
  } catch (err) {
    app.log.error(err)
    throw err
  }
}
