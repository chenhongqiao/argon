import {
  AzureError,
  CompilingResult,
  CompilingStatus,
  CompilingTask,
  CompilingSubmission,
  DataError,
  FailedSubmission,
  GradedSubmission,
  GradingStatus,
  GradingTask,
  GradingResult,
  GradingSubmission,
  JudgerTaskType,
  NewSubmission,
  NotFoundError,
  Problem,
  SubmissionStatus,
  SubmissionResult
} from '@argoncs/types'
import { CosmosDB, messageSender } from '@argoncs/libraries'
import { languageConfigs } from '@argoncs/configs'

import { fetchFromProblemBank } from './problem.services'

const submissionsContainer = CosmosDB.container('submissions')

export async function createSubmission (submission: NewSubmission, problem: { id: string, domainId: string }, userId: string, contestId?: string): Promise<{ submissionId: string }> {
  const newSubmission: Omit<CompilingSubmission, 'id'> = { ...submission, status: SubmissionStatus.Compiling, userId, problem, contestId }
  const created = await submissionsContainer.items.create(newSubmission)
  if (created.resource != null) {
    return { submissionId: created.resource.id }
  }
  throw new AzureError('No resource ID returned.', created)
}

export async function compileSubmission (submissionId: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionId, submissionId)
  const fetched = await submissionItem.read<CompilingSubmission>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Submission not found.', { submissionId })
    } else {
      throw new AzureError('Unexpected CosmosDB return .', fetched)
    }
  }
  const submission = fetched.resource
  const task: CompilingTask = {
    submissionId: submission.id,
    type: JudgerTaskType.Compiling,
    language: submission.language,
    constraints: languageConfigs[submission.language].constraints
  }
  const batch = await messageSender.createMessageBatch()
  if (!batch.tryAddMessage({ body: task })) {
    throw new DataError('Task too big to fit in the queue.', task)
  }
  await messageSender.sendMessages(batch)
}

export async function handleCompileResult (compileResult: CompilingResult, submissionId: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionId, submissionId)
  const fetchedSubmission = await submissionItem.read<CompilingSubmission>()
  if (fetchedSubmission.resource == null) {
    if (fetchedSubmission.statusCode === 404) {
      throw new NotFoundError('Submission not found.', { submissionId })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetchedSubmission)
    }
  }
  const submission = fetchedSubmission.resource
  if (compileResult.status === CompilingStatus.Succeeded) {
    const batch = await messageSender.createMessageBatch()
    let problem: Problem
    if (submission.contestId == null) {
      problem = await fetchFromProblemBank(submission.problem.id, submission.problem.domainId)
    } else {
      // Fetch Contest Problem
      // TODO
    }
    const submissionTestcases: Array<{ points: number, input: string, output: string }> = []
    // @ts-expect-error: TODO
    problem.testcases.forEach((testcase, index) => {
      const task: GradingTask = {
        constraints: problem.constraints,
        type: JudgerTaskType.Grading,
        submissionId,
        testcase: {
          input: testcase.input,
          output: testcase.output
        },
        testcaseIndex: index,
        language: submission.language
      }
      if (!batch.tryAddMessage({ body: task })) {
        throw new DataError('Task too big to fit in the queue.', task)
      }
      submissionTestcases.push({ points: testcase.points, input: testcase.input, output: testcase.output })
    })
    const gradingSubmission: GradingSubmission = {
      ...submission,
      status: SubmissionStatus.Grading,
      gradedCases: 0,
      testcases: submissionTestcases
    }
    await submissionItem.replace(gradingSubmission)
    await messageSender.sendMessages(batch)
  } else {
    const failedSubmission: FailedSubmission = {
      ...submission,
      status: SubmissionStatus.CompileFailed,
      log: compileResult.log
    }
    await submissionItem.replace(failedSubmission)
  }
}

export async function completeGrading (submissionId: string, log?: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionId, submissionId)
  const fetched = await submissionItem.read<CompilingSubmission | GradingSubmission | GradedSubmission>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Submission not found.', { submissionId })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetched)
    }
  }
  const submission = fetched.resource

  if (submission.status === SubmissionStatus.Graded) {
    return
  }
  if (submission.status === SubmissionStatus.Compiling || submission.gradedCases !== submission.testcases.length) {
    const failedSubmission: FailedSubmission = {
      ...submission,
      status: SubmissionStatus.Terminated,
      log
    }
    await submissionItem.replace(failedSubmission)
  } else {
    let score = 0
    submission.testcases.forEach(testcase => {
      if (testcase.result != null && testcase.result.status === GradingStatus.Accepted) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        score += testcase.points
      }
    })

    const { testcases, ...baseSubmission } = submission
    const gradedSubmission: GradedSubmission = {
      ...baseSubmission,
      status: SubmissionStatus.Graded,
      // @ts-expect-error
      testcases,
      score
    }
    await submissionItem.replace(gradedSubmission)
  }
}

export async function handleGradingResult (gradingResult: GradingResult, submissionId: string, testcaseIndex: number): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionId, submissionId)
  const fetched = await submissionItem.read<GradingSubmission | FailedSubmission>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Submission not found.', { submissionId })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetched)
    }
  }
  const submission = fetched.resource
  if (submission.status === SubmissionStatus.Grading) {
    if (submission.testcases[testcaseIndex] == null) {
      throw new NotFoundError('Testcase not found by index.', { testcaseIndex, submissionId })
    }
    if (submission.testcases[testcaseIndex].result == null) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      submission.gradedCases += 1
    }
    submission.testcases[testcaseIndex].result = gradingResult
    await submissionItem.replace(submission)
    if (submission.gradedCases === submission.testcases.length) {
      await completeGrading(submissionId)
    }
  }
}

export async function fetchSubmission (submissionId: string): Promise<SubmissionResult> {
  const submissionItem = submissionsContainer.item(submissionId, submissionId)
  const fetched = await submissionItem.read<SubmissionResult>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('Submission not found.', { submissionId })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetched)
    }
  }

  return fetched.resource
}
