import { Constraints, JudgerTaskType } from './general.type'
import { SubmissionLang } from '../../configs/languages.config'

import { Static, Type } from '@sinclair/typebox'

export interface CompilingTask {
  type: JudgerTaskType.Compiling
  source: string
  constraints: Constraints
  language: SubmissionLang
  submissionID: string
}

export enum CompilingStatus {
  Succeeded = 'CS',
  Failed = 'CF'
}

export const CompileSucceededSchema = Type.Object({
  status: Type.Literal(CompilingStatus.Succeeded)
}, { additionalProperties: false })
export type CompileSucceeded = Static<typeof CompileSucceededSchema>

export const CompileFailedSchema = Type.Object({
  status: Type.Literal(CompilingStatus.Failed),
  log: Type.String()
}, { additionalProperties: false })
export type CompileFailed = Static<typeof CompileFailedSchema>

export const CompilingResultSchema = Type.Union([CompileSucceededSchema, CompileFailedSchema])
export type CompilingResult = Static<typeof CompilingResultSchema>
