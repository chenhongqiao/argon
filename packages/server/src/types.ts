import '@fastify/jwt'
import { UserRole } from '@project-carbon/shared'

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
