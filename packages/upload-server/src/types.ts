import { type FastifyBaseLogger, type FastifyInstance, type RawReplyDefaultExpression, type RawRequestDefaultExpression, type RawServerDefault } from 'fastify'
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

export type FastifyTypeBox = FastifyInstance<
RawServerDefault,
RawRequestDefaultExpression<RawServerDefault>,
RawReplyDefaultExpression<RawServerDefault>,
FastifyBaseLogger,
TypeBoxTypeProvider
>
