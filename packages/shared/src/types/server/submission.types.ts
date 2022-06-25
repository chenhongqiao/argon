import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from '../../configs/languages.config'

import { SubmissionAccepted, SubmissionWrongAnswer } from '../judger/grade.types'
import { SandboxSystemError, SandboxTimeExceeded, SandboxRuntimeError, SandboxMemoryExceeded } from '../judger/general.types'

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

export interface CompilingSubmission {
  language: SubmissionLang
  source: string
  problemID: string
  submissionID: string
  status: SubmissionStatus.Compiling
}

export interface GradingSubmission {
  language: SubmissionLang
  source: string
  problemID: string
  submissionID: string
  status: SubmissionStatus.Grading
  gradedCases: number
  testcases: Array<{
    points: number
    result?: SubmissionAccepted
    |SubmissionWrongAnswer
    |SandboxSystemError
    |SandboxTimeExceeded
    |SandboxRuntimeError
    |SandboxMemoryExceeded
  }>
}

export interface FailedSubmission {
  language: SubmissionLang
  source: string
  problemID: string
  submissionID: string
  log?: string
  status: SubmissionStatus.CompileFailed | SubmissionStatus.Terminated
}

export interface GradedSubmission {
  language: SubmissionLang
  source: string
  problemID: string
  submissionID: string
  status: SubmissionStatus.Graded
  score: number
  testcases: Array<{
    testcaseID: string
    points: number
    result: SubmissionAccepted
    |SubmissionWrongAnswer
    |SandboxSystemError
    |SandboxTimeExceeded
    |SandboxRuntimeError
    |SandboxMemoryExceeded
  }>
}
