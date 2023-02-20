import { Static, Type } from '@sinclair/typebox'

import { ConstraintsSchema } from './judger.types'

export const NewProblemSchema = Type.Object({
  name: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  constraints: ConstraintsSchema,
  samples: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  ),
  testcases: Type.Optional(Type.Array(
    Type.Object({
      input: Type.Object({ name: Type.String(), versionId: Type.String() }),
      output: Type.Object({ name: Type.String(), versionId: Type.String() }),
      points: Type.Number()
    }))
  )
}, { additionalProperties: false })

export type NewProblem = Static<typeof NewProblemSchema>

export const ProblemSchema = Type.Intersect([NewProblemSchema, Type.Object({
  id: Type.String({ minLength: 12, maxLength: 12 }),
  domainId: Type.String({ minLength: 12, maxLength: 12 })
})])

export type Problem = Static<typeof ProblemSchema>
