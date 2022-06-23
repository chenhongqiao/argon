import { Static, Type } from '@sinclair/typebox'

import { SubmissionLang } from '../../configs/languages.config'

import { CompileFailed, CompileSucceeded } from '../judger/compile.types'
import { SubmissionAccepted, SubmissionWrongAnswer } from '../judger/grade.types'
import { SandboxSystemError, SandboxTimeExceeded, SandboxRuntimeError, SandboxMemoryExceeded } from '../judger/general.types'

export const NewSubmissionSchema = Type.Object({
  language: Type.Enum(SubmissionLang),
  source: Type.String(),
  problemID: Type.String()
})

export type NewSubmission = Static<typeof NewSubmissionSchema>

export interface Submission {
  language: SubmissionLang
  source: string
  problemID: string
  submissionID: string
  status: CompileFailed
  |CompileSucceeded
  |SubmissionAccepted
  |SubmissionWrongAnswer
  |SandboxSystemError
  |SandboxTimeExceeded
  |SandboxRuntimeError
  |SandboxMemoryExceeded
}
