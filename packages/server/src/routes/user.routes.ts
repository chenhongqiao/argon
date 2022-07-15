import { FastifyPluginCallback } from 'fastify'

import { registerUser } from '../services/user.services'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { Type } from '@sinclair/typebox'
import { ConflictError, NewUserSchema } from '@chenhongqiao/carbon-common'

export const userRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewUserSchema,
        response: {
          201: Type.Object({ userID: Type.String() }),
          409: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const user = request.body
      try {
        const result = await registerUser(user)
        void reply.status(201).send(result)
      } catch (err) {
        if (err instanceof ConflictError) {
          void reply.status(409).send({ message: err.message })
        } else {
          throw err
        }
      }
    }
  )
  done()
}
