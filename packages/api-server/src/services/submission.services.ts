import {
  CompilingTask,
  JudgerTaskType,
  NewSubmission,
  SubmissionStatus,
  Submission,
  Problem
} from '@argoncs/types'
import { rabbitMQ, judgerExchange, judgerTasksKey, submissionCollection, fetchDomainProblem, fetchContestProblem } from '@argoncs/common'
import { languageConfigs } from '../../configs/language.configs.js'

import { nanoid } from '../utils/nanoid.utils.js'
import { MethodNotAllowedError, NotFoundError } from 'http-errors-enhanced'

async function createSubmission (submission: NewSubmission, problemId: string, userId: string, domainId?: string, contestId?: string, teamId?: string): Promise<{ submissionId: string }> {
  let problem: Problem
  if (contestId == null && domainId != null) {
    problem = await fetchDomainProblem(problemId, domainId)
  } else if (contestId != null && domainId == null) {
    problem = await fetchContestProblem(problemId, contestId)
  } else {
    throw new NotFoundError('Unable to locate problem')
  }
  if (problem.testcases == null) {
    throw new MethodNotAllowedError('Problem does not have testcases uploaded')
  }

  const submissionId = await nanoid()
  const pendingSubmission: Submission = {
    ...submission,
    id: submissionId,
    status: SubmissionStatus.Compiling,
    domainId: problem.domainId,
    problemId: problem.id,
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

export async function createTestingSubmission (submission: NewSubmission, problemId: string, userId: string, domainId: string): Promise<{ submissionId: string }> {
  return await createSubmission(submission, problemId, userId, domainId, undefined, undefined)
}

export async function createContestSubmission (submission: NewSubmission, problemId: string, userId: string, contestId: string, teamId?: string): Promise<{ submissionId: string }> {
  return await createSubmission(submission, problemId, userId, undefined, contestId, teamId)
}

export async function markSubmissionAsCompiling (submissionId: string): Promise<void> {
  await submissionCollection.updateOne({ id: submissionId }, {
    $set: {
      status: SubmissionStatus.Compiling
    }
  })
}

export async function fetchContestProblemSubmissions (contestId: string, problemId: string, teamId?: string): Promise<Submission[]> {
  if (teamId != null) {
    return await submissionCollection.find({ contestId, problemId, teamId }).sort({ createdAt: -1 }).toArray()
  } else {
    return await submissionCollection.find({ contestId, problemId }).sort({ createdAt: -1 }).toArray()
  }
}

export async function fetchContestTeamSubmissions (contestId: string, teamId: string): Promise<Submission[]> {
  return await submissionCollection.find({ contestId, teamId }).sort({ createdAt: -1 }).toArray()
}

export async function fetchUserSubmissions (userId: string): Promise<Submission[]> {
  return await submissionCollection.find({ userId }).sort({ createdAt: -1 }).toArray()
}
