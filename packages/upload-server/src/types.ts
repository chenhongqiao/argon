import '@fastify/jwt'

import { JWTPayload } from '@argoncs/types'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
  }
}
