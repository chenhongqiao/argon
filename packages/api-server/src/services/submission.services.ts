import {
  CompilingTask,
  JudgerTaskType,
  NewSubmission,
  SubmissionStatus,
  Submission
} from '@argoncs/types'
import { rabbitMQ, judgerExchange, judgerTasksKey, submissionCollection } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

import { nanoid } from '../utils/nanoid.utils.js'

export async function createSubmission (submission: NewSubmission, domainId: string, problemId: string, userId: string, contestId?: string, teamId?: string): Promise<{ submissionId: string }> {
  const submissionId = await nanoid()
  const pendingSubmission: Submission = {
    ...submission,
    id: submissionId,
    status: SubmissionStatus.Compiling,
    domainId,
    problemId,
    userId,
    createdAt: (new Date()).getTime()
  }

  if (contestId != null) {
    pendingSubmission.contestId = contestId
  }
  if (teamId != null) {
    pendingSubmission.teamId = teamId
  }

  await submissionCollection.insertOne(pendingSubmission)

  const task: CompilingTask = {
    submissionId,
    type: JudgerTaskType.Compiling,
    source: submission.source,
    language: submission.language,
    constraints: languageConfigs[submission.language].constraints
  }
  rabbitMQ.publish(judgerExchange, judgerTasksKey, Buffer.from(JSON.stringify(task)))

  return { submissionId }
}

export async function markSubmissionAsCompiling (submissionId: string): Promise<void> {
  await submissionCollection.updateOne({ id: submissionId }, {
    $set: {
      status: SubmissionStatus.Compiling
    }
  })
}
