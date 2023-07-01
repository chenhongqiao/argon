import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from './compilation.types.js'

import { GradingResultSchema } from './grading.types.js'

export enum SubmissionStatus {
  Compiling = 'Compiling',
  Grading = 'Grading',
  CompileFailed = 'CompileFailed',
  Graded = 'Graded',
  Terminated = 'Terminated'
}

export const NewSubmissionSchema = Type.Object({
  language: Type.Enum(SubmissionLang),
  source: Type.String()
})
export type NewSubmission = Static<typeof NewSubmissionSchema>

const BaseSubmissionSchema = Type.Intersect([NewSubmissionSchema, Type.Object({
  id: Type.String(),
  problemId: Type.String(),
  domainId: Type.String(),
  contestId: Type.Optional(Type.String()),
  teamId: Type.Optional(Type.String()),
  userId: Type.String(),
  createdAt: Type.Number()
})])

const CompilingSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Compiling)
})])

const GradingSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Grading),
  gradedCases: Type.Number(),
  testcases: Type.Array(Type.Object({
    points: Type.Number(),
    score: Type.Optional(Type.Number()),
    result: Type.Optional(GradingResultSchema)
  }))
})])

const CompileFailedSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.CompileFailed),
  log: Type.Optional(Type.String())
})])

const TerminatedSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Terminated),
  log: Type.Optional(Type.String())
})])

const GradedSubmissionSchema = Type.Intersect([BaseSubmissionSchema, Type.Object({
  status: Type.Literal(SubmissionStatus.Graded),
  score: Type.Number(),
  testcases: Type.Array(Type.Object({
    points: Type.Number(),
    score: Type.Number(),
    result: GradingResultSchema
  }))
})])

export const SubmissionSchema = Type.Intersect([Type.Union([CompilingSubmissionSchema, GradingSubmissionSchema, GradedSubmissionSchema, CompileFailedSubmissionSchema, TerminatedSubmissionSchema])])
export type Submission = Static<typeof SubmissionSchema>
