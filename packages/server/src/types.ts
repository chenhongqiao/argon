import '@fastify/jwt'

export interface JWTPayload {
  userId: string
  scopes: Record<string, string[]>
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
  }
}
