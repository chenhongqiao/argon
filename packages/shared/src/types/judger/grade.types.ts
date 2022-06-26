import { SubmissionLang } from '../../configs/languages.config'

import {
  JudgerTaskType,
  Constraints,
  SandboxSystemErrorSchema,
  SandboxTimeExceededSchema,
  SandboxRuntimeErrorSchema, SandboxMemoryExceededSchema
} from './general.types'

import { Static, Type } from '@sinclair/typebox'

export enum GradeStatus {
  Accepted = 'AC',
  WrongAnswer = 'WA',
}

export interface GradeTask {
  type: JudgerTaskType.Grade
  submissionID: string
  testcaseID: {
    input: string
    output: string
  }
  testcaseIndex: number
  constraints: Constraints
  language: SubmissionLang
}

export const SolutionAcceptedSchema = Type.Object({
  status: Type.Literal(GradeStatus.Accepted),
  message: Type.String(),
  memory: Type.Number(),
  time: Type.Number(),
  wallTime: Type.Number()
}, { additionalProperties: false })
export type SolutionAccepted = Static<typeof SolutionAcceptedSchema>

export const SolutionWrongAnswerSchema = Type.Object({
  status: Type.Literal(GradeStatus.WrongAnswer),
  message: Type.String(),
  memory: Type.Number(),
  time: Type.Number(),
  wallTime: Type.Number()
}, { additionalProperties: false })
export type SolutionWrongAnswer = Static<typeof SolutionWrongAnswerSchema>

export const GradingResultSchema = Type.Union([
  SolutionAcceptedSchema,
  SolutionWrongAnswerSchema,
  SandboxSystemErrorSchema,
  SandboxTimeExceededSchema,
  SandboxRuntimeErrorSchema,
  SandboxMemoryExceededSchema
])
export type GradingResult = Static<typeof GradingResultSchema>
