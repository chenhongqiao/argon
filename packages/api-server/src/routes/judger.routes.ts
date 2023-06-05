import { FastifyPluginCallback } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import languageConfigs from '../../configs/languages.json'

import { verifySuperAdmin } from '../auth/role.auth'
import { userIdExists } from '../services/user.services'
import { JWTPayloadType, SubmissionLang, UserRole, LanguageConfigSchema } from '@argoncs/types'

import { randomUUID } from 'crypto'

export const judgerPublicRoutes: FastifyPluginCallback = (app, options, done) => {
  const publicRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  publicRoutes.get(
    '/language-config',
    {
      schema: {
        response: {
          200: Type.Record(Type.Enum(SubmissionLang), LanguageConfigSchema)
        }
      }
    },
    async (request, reply) => {
      await reply.status(200).send(languageConfigs)
    }
  )
}

export const judgerPrivateRoutes: FastifyPluginCallback = (app, options, done) => {
  const privateRoutes = app.withTypeProvider<TypeBoxTypeProvider>()
  privateRoutes.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
      if (request.user.type !== JWTPayloadType.Identification) {
        return reply.unauthorized('JWT Token must be valid for identification.')
      }
    } catch (err) {
      reply.unauthorized('Authentication is required for judger operations.')
    }
  })
  privateRoutes.get(
    '/authentication-token',
    {
      schema: {
        response: {
          200: Type.Object({ token: Type.String() })
        }
      },
      preValidation: [privateRoutes.auth([verifySuperAdmin]) as any]
    },
    async (request, reply) => {
      let userId: string = randomUUID()
      while (await userIdExists(userId)) {
        userId = randomUUID()
      }
      const token = await reply.jwtSign({ type: JWTPayloadType.Identification, userId, scopes: {}, role: UserRole.Judger })
      return await reply.status(200).send({ token })
    }
  )
  return done()
}
