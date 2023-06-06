import { Type } from '@sinclair/typebox'
import languageConfigs from '../../configs/languages.json'

import { SubmissionLang, LanguageConfigSchema } from '@argoncs/types'

import { FastifyTypeBox } from '../types'

export async function judgerRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox) => {
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
  })
}
