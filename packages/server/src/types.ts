import '@fastify/jwt'
import { UserRole } from '@argoncs/types'

export interface JWTPayload {
  userId: string
  scopes: Record<string, string[]>
  role: UserRole
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
  }
}
