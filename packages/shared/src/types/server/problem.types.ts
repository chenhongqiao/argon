import { Static, Type } from '@sinclair/typebox'

import { ConstraintsSchema } from '../judger/general.types'

export const NewProblemSchema = Type.Object({
  name: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  constraints: ConstraintsSchema,
  samples: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  ),
  testcases: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String(), points: Type.Number() })
  )
}, { additionalProperties: false })

export type NewProblem = Static<typeof NewProblemSchema>

export const ProblemSchema = Type.Object({
  name: Type.String(),
  id: Type.String(),
  context: Type.String(),
  inputFormat: Type.String(),
  outputFormat: Type.String(),
  constraints: ConstraintsSchema,
  samples: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String() })
  ),
  testcases: Type.Array(
    Type.Object({ input: Type.String(), output: Type.String(), points: Type.Number() })
  )
}, { additionalProperties: false })

export type Problem = Static<typeof ProblemSchema>
