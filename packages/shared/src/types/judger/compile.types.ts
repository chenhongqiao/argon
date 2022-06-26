import { Constraints, JudgerTaskType } from './general.types'
import { SubmissionLang } from '../../configs/languages.config'

import { Type, Static } from '@sinclair/typebox'

export interface CompileTask {
  type: JudgerTaskType.Compile
  source: string
  constrains: Constraints
  language: SubmissionLang
  submissionID: string
}

export enum CompileStatus {
  Succeeded = 'CS',
  Failed = 'CF'
}

export const CompileSucceededSchema = Type.Object({
  status: Type.Literal(CompileStatus.Succeeded)
}, { additionalProperties: false })
export type CompileSucceeded = Static<typeof CompileSucceededSchema>

export const CompileFailedSchema = Type.Object({
  status: Type.Literal(CompileStatus.Failed),
  log: Type.String()
}, { additionalProperties: false })
export type CompileFailed = Static<typeof CompileFailedSchema>

export const CompileResultSchema = Type.Union([CompileSucceededSchema, CompileFailedSchema])
export type CompileResult = Static<typeof CompileResultSchema>
