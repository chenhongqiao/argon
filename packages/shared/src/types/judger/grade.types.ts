import { SubmissionLang } from '../../configs/languages.config'

import { JudgerTaskType, Constraints } from './general.types'

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

export interface SubmissionAccepted {
  status: GradeStatus.Accepted
  message: string
  memory: number
  time: number
  wallTime: number
}

export interface SubmissionWrongAnswer {
  status: GradeStatus.WrongAnswer
  message: string
  memory: number
  time: number
  wallTime: number
}
