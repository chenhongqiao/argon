import { Constraints, JudgerTaskType } from './general.types'
import { SubmissionLang } from '../../configs/languages.config'

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

export interface CompileSucceeded {
  status: CompileStatus.Succeeded
}

export interface CompileFailed {
  status: CompileStatus.Failed
  log: string
}
