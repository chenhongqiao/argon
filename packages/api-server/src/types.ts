import { type AuthenticationProfile } from '@argoncs/types'
import {
  type FastifyInstance,
  type FastifyBaseLogger,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault
} from 'fastify'
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

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
