import {
  type CompilingTask,
  JudgerTaskType,
  type NewSubmission,
  SubmissionStatus,
  type Submission,
  type Problem
} from '@argoncs/types'
import { rabbitMQ, judgerExchange, judgerTasksKey, submissionCollection, fetchDomainProblem, fetchContestProblem } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

import { nanoid } from 'nanoid'
import { MethodNotAllowedError } from 'http-errors-enhanced'

async function createSubmission ({ submission, userId, target }: { submission: NewSubmission, userId: string, target: { problemId: string, domainId: string } | { problemId: string, contestId: string, teamId?: string } }): Promise<{ submissionId: string }> {
  let problem: Problem
  const { problemId } = target
  if ('contestId' in target) {
    problem = await fetchContestProblem({ problemId, contestId: target.contestId })
  } else {
    problem = await fetchDomainProblem({ problemId, domainId: target.domainId })
  }

  if (problem.testcases == null) {
    throw new MethodNotAllowedError('Problem does not have testcases uploaded')
  }

  const submissionId = nanoid()
  const pendingSubmission: Submission = {
    ...submission,
    id: submissionId,
    status: SubmissionStatus.Compiling,
    domainId: problem.domainId,
    problemId: problem.id,
    userId,
    createdAt: (new Date()).getTime()
  }

  if ('contestId' in target) {
    pendingSubmission.contestId = target.contestId
    pendingSubmission.teamId = target.teamId
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

export async function createTestingSubmission ({ submission, problemId, userId, domainId }: { submission: NewSubmission, problemId: string, userId: string, domainId: string }): Promise<{ submissionId: string }> {
  return await createSubmission({ submission, userId, target: { problemId, domainId } })
}

export async function createContestSubmission ({ submission, problemId, userId, contestId, teamId = undefined }: { submission: NewSubmission, problemId: string, userId: string, contestId: string, teamId?: string }): Promise<{ submissionId: string }> {
  return await createSubmission({ submission, userId, target: { problemId, contestId, teamId } })
}

export async function markSubmissionAsCompiling ({ submissionId }: { submissionId: string }): Promise<void> {
  await submissionCollection.updateOne({ id: submissionId }, {
    $set: {
      status: SubmissionStatus.Compiling
    }
  })
}

export async function querySubmissions ({ query }: { query: { problemId?: string, teamId?: string, userId?: string, contestId?: string, domainId?: string } }): Promise<Submission[]> {
  return await submissionCollection.find(query).sort({ createdAt: -1 }).toArray()
}
