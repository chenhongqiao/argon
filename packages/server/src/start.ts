import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { ajvTypeBoxPlugin, TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { problemsRoutes } from './routes/problems.route'
import { testcasesRoutes } from './routes/testcases.route'
import { heartbeatRoutes } from './routes/heartbeat.route'
import { submissionsRoutes } from './routes/submissions.route'

const app = Fastify({
  logger: true,
  ajv: {
    plugins: [ajvTypeBoxPlugin]
  }
}).withTypeProvider<TypeBoxTypeProvider>()

export async function startServer (): Promise<void> {
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
    console.log(`Server started on port ${port}.`)
  } catch (err) {
    app.log.error(err)
    throw err
  }
}
