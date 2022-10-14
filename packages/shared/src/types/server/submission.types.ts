import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from '../../configs/language.configs'

import { GradingResultSchema } from '../judger/grade.types'

export const NewSubmissionSchema = Type.Object({
  language: Type.Enum(SubmissionLang),
  source: Type.String()
})

export type NewSubmission = Static<typeof NewSubmissionSchema>

export enum SubmissionStatus {
  Compiling = 'Compiling',
  Grading = 'Grading',
  CompileFailed = 'CompileFailed',
  Graded = 'Graded',
  Terminated = 'Terminated'
}

const BaseSubmissionSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  id: Type.String(),
  userId: Type.String(),
  problem: Type.Object({
    id: Type.String(),
    domainId: Type.String()
  }),
  contestId: Type.Optional(Type.String())
})])

export const CompilingSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Compiling)
})])
export type CompilingSubmission = Static<typeof CompilingSubmissionSchema>

export const GradingSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Grading),
  gradedCases: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    result: Type.Optional(GradingResultSchema)
  }))
})])
export type GradingSubmission = Static<typeof GradingSubmissionSchema>

export const FailedSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Union([Type.Literal(SubmissionStatus.CompileFailed), Type.Literal(SubmissionStatus.Terminated)]),
  log: Type.Optional(Type.String())
})])
export type FailedSubmission = Static<typeof FailedSubmissionSchema>

export const GradedSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Graded),
  score: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    result: GradingResultSchema
  }))
})])
export type GradedSubmission = Static<typeof GradedSubmissionSchema>

export const SubmissionResultSchema = Type.Union([CompilingSubmissionSchema, GradedSubmissionSchema, GradingSubmissionSchema, FailedSubmissionSchema])
export type SubmissionResult = Static<typeof SubmissionResultSchema>
