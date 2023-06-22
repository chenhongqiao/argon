import { Type } from '@sinclair/typebox'

import { FastifyTypeBox } from '../types.js'

export async function heartbeatRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox, options, done) => {
    publicRoutes.get(
      '/',
      {
        schema: {
          response: {
            200: Type.Object({ version: Type.String(), name: Type.String(), online: Type.Boolean() })
          }
        }
      },
      async (request, reply) => {
        console.log(process.env)
        return await reply.status(200).send({ version: process.env.npm_package_version ?? 'Unknown', online: true, name: process.env.npm_package_name ?? '@argoncs/api-server' })
      }
    )

    done()
  })
}
