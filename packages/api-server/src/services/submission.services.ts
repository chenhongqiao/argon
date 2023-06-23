import {
  CompilingTask,
  JudgerTaskType,
  NewSubmission,
  SubmissionStatus,
  Submission
} from '@argoncs/types'
import { rabbitMQ, judgerExchange, judgerTasksKey, fetchSubmission, submissionCollection } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

import { nanoid } from '../utils/nanoid.utils.js'

export async function createTestingSubmission (submission: NewSubmission, domainId: string, problemId: string, userId: string): Promise<{ submissionId: string }> {
  const submissionId = await nanoid()
  const pendingSubmission: Submission = {
    ...submission,
    id: submissionId,
    status: SubmissionStatus.Compiling,
    domainId,
    problemId,
    userId
  }

  await submissionCollection.insertOne(pendingSubmission)
  return { submissionId }
}

export async function queueSubmission (submissionId: string): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  const task: CompilingTask = {
    submissionId: submission.id,
    type: JudgerTaskType.Compiling,
    source: submission.source,
    language: submission.language,
    constraints: languageConfigs[submission.language].constraints
  }
  rabbitMQ.publish(judgerExchange, judgerTasksKey, Buffer.from(JSON.stringify(task)))
}

export async function markSubmissionAsCompiling (submissionId: string): Promise<void> {
  await submissionCollection.updateOne({ id: submissionId }, {
    $set: {
      status: SubmissionStatus.Compiling
    }
  })
}
