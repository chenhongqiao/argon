import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from './compilation.types'

import { GradingResultSchema } from './grading.types'

export enum SubmissionStatus {
  Pending = 'Pending',
  Compiling = 'Compiling',
  Grading = 'Grading',
  CompileFailed = 'CompileFailed',
  Graded = 'Graded',
  Terminated = 'Terminated'
}

export enum SubmissionType {
  Contest = 'Contest',
  Testing = 'Testing'
}

export const NewSubmissionSchema = Type.Object({
  language: Type.Enum(SubmissionLang),
  source: Type.String()
})
export type NewSubmission = Static<typeof NewSubmissionSchema>

export const BaseContestSubmissionSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  type: Type.Literal(SubmissionType.Contest),
  problemId: Type.String({ minLength: 12, maxLength: 12 }),
  contestId: Type.String({ minLength: 12, maxLength: 12 })
})])

const BaseContestSubmissionWithoutIdsSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  type: Type.Literal(SubmissionType.Contest)
})])

export const BaseTestingSubmissionSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  type: Type.Literal(SubmissionType.Testing),
  problemId: Type.String({ minLength: 12, maxLength: 12 }),
  domainId: Type.String({ minLength: 12, maxLength: 12 })
})])

const BaseTestingSubmissionWithoutIdsSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  type: Type.Literal(SubmissionType.Testing)
})])

const PendingSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Pending)
})

const CompilingSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Compiling)
})

const GradingSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Grading),
  gradedCases: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    score: Type.Optional(Type.Number()),
    result: Type.Optional(GradingResultSchema)
  }))
})

const FailedSubmissionSchema = Type.Object({
  status: Type.Union([Type.Literal(SubmissionStatus.CompileFailed), Type.Literal(SubmissionStatus.Terminated)]),
  log: Type.Optional(Type.String())
})

const GradedSubmissionSchema = Type.Object({
  status: Type.Literal(SubmissionStatus.Graded),
  score: Type.Number(),
  testcases: Type.Array(Type.Object({
    input: Type.String(),
    output: Type.String(),
    points: Type.Number(),
    score: Type.Number(),
    result: GradingResultSchema
  }))
})

export const ContestSubmissionSchema = Type.Union([
  Type.Intersect([PendingSubmissionSchema, BaseContestSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([CompilingSubmissionSchema, BaseContestSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([GradingSubmissionSchema, BaseContestSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([GradedSubmissionSchema, BaseContestSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([FailedSubmissionSchema, BaseContestSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })])])
export type ContestSubmission = Static<typeof ContestSubmissionSchema>

export const TestingSubmissionSchema = Type.Union([
  Type.Intersect([PendingSubmissionSchema, BaseTestingSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([CompilingSubmissionSchema, BaseTestingSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([GradingSubmissionSchema, BaseTestingSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([GradedSubmissionSchema, BaseTestingSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })]),
  Type.Intersect([FailedSubmissionSchema, BaseTestingSubmissionSchema, Type.Object({ id: Type.String({ minLength: 12, maxLength: 12 }) })])])
export type TestingSubmission = Static<typeof TestingSubmissionSchema>

const ContestSubmissionWithoutIdsSchema = Type.Union([
  Type.Intersect([PendingSubmissionSchema, BaseContestSubmissionWithoutIdsSchema]),
  Type.Intersect([CompilingSubmissionSchema, BaseContestSubmissionWithoutIdsSchema]),
  Type.Intersect([GradingSubmissionSchema, BaseContestSubmissionWithoutIdsSchema]),
  Type.Intersect([GradedSubmissionSchema, BaseContestSubmissionWithoutIdsSchema]),
  Type.Intersect([FailedSubmissionSchema, BaseContestSubmissionWithoutIdsSchema])
])
export type ContestSubmissionWithoutIds = Static<typeof ContestSubmissionWithoutIdsSchema>

const TestingSubmissionWithoutIdsSchema = Type.Union([
  Type.Intersect([PendingSubmissionSchema, BaseTestingSubmissionWithoutIdsSchema]),
  Type.Intersect([CompilingSubmissionSchema, BaseTestingSubmissionWithoutIdsSchema]),
  Type.Intersect([GradingSubmissionSchema, BaseTestingSubmissionWithoutIdsSchema]),
  Type.Intersect([GradedSubmissionSchema, BaseTestingSubmissionWithoutIdsSchema]),
  Type.Intersect([FailedSubmissionSchema, BaseTestingSubmissionWithoutIdsSchema])
])
export type TestingSubmissionWithoutIds = Static<typeof TestingSubmissionWithoutIdsSchema>
