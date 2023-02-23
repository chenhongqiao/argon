import { Constraints, JudgerTaskType, ConstraintsSchema } from './judger.types'
import { Static, Type } from '@sinclair/typebox'

export enum SubmissionLang {
  C = 'C',
  CPP = 'C++',
}

export const LanguageConfigSchema = Type.Object({
  srcFile: Type.String(),
  binaryFile: Type.String(),
  displayName: Type.String(),
  compileCommand: Type.String(),
  executeCommand: Type.String(),
  constraints: ConstraintsSchema
})
export type LanguageConfig = Static<typeof LanguageConfigSchema>

export interface CompilingTask {
  type: JudgerTaskType.Compiling
  constraints: Constraints
  language: SubmissionLang
  source: string
  submissionId: string
}

export enum CompilingStatus {
  Succeeded = 'CS',
  Failed = 'CF'
}

export const CompileSucceededSchema = Type.Object({
  status: Type.Literal(CompilingStatus.Succeeded)
})
export type CompileSucceeded = Static<typeof CompileSucceededSchema>

export const CompileFailedSchema = Type.Object({
  status: Type.Literal(CompilingStatus.Failed),
  log: Type.String()
})
export type CompileFailed = Static<typeof CompileFailedSchema>

// When using Type.Union, all children should not have addtionalProperties: false set to avoid an ajv issue
export const CompilingResultSchema = Type.Union([CompileSucceededSchema, CompileFailedSchema])
export type CompilingResult = Static<typeof CompilingResultSchema>
