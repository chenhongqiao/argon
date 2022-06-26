import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from '../../configs/languages.config'

import {
  GradingResultSchema
} from '../judger/grade.types'

export const NewSubmissionSchema = Type.Object({
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String()
})

export type NewSubmission = Static<typeof NewSubmissionSchema>

export enum SubmissionStatus {
  Compiling = 'Compiling',
  Grading = 'Grading',
  CompileFailed = 'CompileFailed',
  Graded = 'Graded',
  Terminated = 'Terminated'
}

export const CompilingSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Compiling),
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String(),
  id: Type.String()
}, { additionalProperties: false })
export type CompilingSubmission = Static<typeof CompilingSubmissionSchema>

export const GradingSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Grading),
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String(),
  id: Type.String(),
  gradedCases: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    result: Type.Optional(GradingResultSchema)
  }))
}, { additionalProperties: false })
export type GradingSubmission = Static<typeof GradingSubmissionSchema>

export const FailedSubmissionSchema = Type.Object({
  status: Type.Union([Type.Literal(SubmissionStatus.CompileFailed), Type.Literal(SubmissionStatus.Terminated)]),
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String(),
  id: Type.String(),
  log: Type.Optional(Type.String())
}, { additionalProperties: false })
export type FailedSubmission = Static<typeof FailedSubmissionSchema>

export const GradedSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Graded),
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String(),
  id: Type.String(),
  score: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    result: GradingResultSchema
  }))
}, { additionalProperties: false })
export type GradedSubmission = Static<typeof GradedSubmissionSchema>
