import { Type } from '@sinclair/typebox'

import { version, name } from '../../package.json'
import { FastifyTypeBox } from '../types'

export async function heartbeatRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox) => {
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
        return await reply.status(200).send({ version, online: true, name })
      }
    )
  })
}
