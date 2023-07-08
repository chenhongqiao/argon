import { Type } from '@sinclair/typebox'
import { languageConfigs } from '../../../configs/language.configs.js'

import { SubmissionLang, LanguageConfigSchema } from '@argoncs/types'

import { FastifyTypeBox } from '../../types.js'

export async function judgerRoutes (app: FastifyTypeBox): Promise<void> {
  await app.register((publicRoutes: FastifyTypeBox, options, done) => {
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

    done()
  })
}
