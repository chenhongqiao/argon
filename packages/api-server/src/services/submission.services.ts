import {
  CompilingTask,
  JudgerTaskType,
  NewSubmission,
  SubmissionStatus,
  ContestSubmission,
  TestingSubmission,
  SubmissionType
} from '@argoncs/types'
import { rabbitMQ, mongoDB, judgerExchange, judgerTasksKey, fetchSubmission } from '@argoncs/common'
import languageConfigs from '../../configs/languages.json'

import { nanoid } from '../utils/nanoid.utils'

const submissionCollection = mongoDB.collection<TestingSubmission | ContestSubmission>('submissions')

export async function createTestingSubmission (submission: NewSubmission, domainId: string, problemId: string, userId: string): Promise<{ submissionId: string }> {
  const submissionId = await nanoid()
  const pendingSubmission: TestingSubmission = {
    ...submission,
    id: submissionId,
    status: SubmissionStatus.Pending,
    domainId,
    problemId,
    type: SubmissionType.Testing
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
