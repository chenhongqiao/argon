import { Static, Type } from '@sinclair/typebox'

import { ConstraintsSchema } from './judger.types.js'

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
  id: Type.String(),
  domainId: Type.String()
})])
export type Problem = Static<typeof ProblemSchema>

export const ContestProblemSchema = Type.Intersect([ProblemSchema, Type.Object({ contestId: Type.String(), obsolete: Type.Boolean() })])
export type ContestProblem = Static<typeof ContestProblemSchema>

export interface TestcaseUpload {
  id: string
  problemId: string
  domainId: string
  createdAt: number
}
