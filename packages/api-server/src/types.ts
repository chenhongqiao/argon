import '@fastify/jwt'
import { AuthenticationProfile, JWTPayload } from '@argoncs/types'
import {
  FastifyInstance,
  FastifyBaseLogger,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault
} from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthenticationProfile | null
  }
}

export type FastifyTypeBox = FastifyInstance<
RawServerDefault,
RawRequestDefaultExpression<RawServerDefault>,
RawReplyDefaultExpression<RawServerDefault>,
FastifyBaseLogger,
TypeBoxTypeProvider
>
