import {
  AzureError,
  CompilingResult,
  CompilingStatus,
  CompilingTask,
  CompilingSubmission,
  cosmosDB,
  DataError,
  FailedSubmission,
  GradedSubmission,
  GradingStatus,
  GradingTask,
  GradingResult,
  GradingSubmission,
  JudgerTaskType,
  languageConfigs,
  messageSender,
  NewSubmission,
  NotFoundError,
  Problem,
  SubmissionStatus
} from '@project-carbon/shared'

const submissionsContainer = cosmosDB.container('submissions')
const problemsContainer = cosmosDB.container('problems')

export async function createSubmission (submission: NewSubmission): Promise<{ submissionID: string }> {
  const newSubmission = { ...submission, status: SubmissionStatus.Compiling }
  const result = await submissionsContainer.items.create(newSubmission)
  if (result.resource != null) {
    return { submissionID: result.resource.id }
  }
  throw new AzureError('No resource ID returned.', result)
}

export async function compileSubmission (submissionID: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  const task: CompilingTask = {
    submissionID: submission.id,
    source: submission.source,
    type: JudgerTaskType.Compiling,
    language: submission.language,
    constraints: languageConfigs[submission.language].constraints
  }
  const batch = await messageSender.createMessageBatch()
  if (!batch.tryAddMessage({ body: task })) {
    throw new DataError('Task too big to fit in the queue.', JSON.stringify(submission))
  }
  await messageSender.sendMessages(batch)
}

export async function handleCompileResult (compileResult: CompilingResult, submissionID: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  if (compileResult.status === CompilingStatus.Succeeded) {
    const batch = await messageSender.createMessageBatch()
    const problemItem = problemsContainer.item(submission.problemID, submission.problemID)
    const problemFetchResult = await problemItem.read<Problem>()
    if (problemFetchResult.resource == null) {
      if (problemFetchResult.statusCode === 404) {
        throw new NotFoundError('Problem not found.', submission.problemID)
      } else {
        throw new AzureError('Unexpected CosmosDB return.', problemFetchResult)
      }
    }
    const problem: Problem = problemFetchResult.resource
    const submissionTestcases: Array<{points: number, input: string, output: string}> = []
    problem.testcases.forEach((testcase, index) => {
      const task: GradingTask = {
        constraints: problem.constraints,
        type: JudgerTaskType.Grading,
        submissionID,
        testcase: {
          input: testcase.input,
          output: testcase.output
        },
        testcaseIndex: index,
        language: submission.language
      }
      if (!batch.tryAddMessage({ body: task })) {
        throw new DataError('Task too big to fit in the queue.', JSON.stringify(task))
      }
      submissionTestcases.push({ points: testcase.points, input: testcase.input, output: testcase.output })
    })
    const gradingSubmission: GradingSubmission = {
      status: SubmissionStatus.Grading,
      language: submission.language,
      source: submission.source,
      id: submission.id,
      problemID: submission.problemID,
      gradedCases: 0,
      testcases: submissionTestcases
    }
    await submissionItem.replace(gradingSubmission)
    await messageSender.sendMessages(batch)
  } else {
    const failedSubmission: FailedSubmission = {
      status: SubmissionStatus.CompileFailed,
      language: submission.language,
      source: submission.source,
      id: submission.id,
      problemID: submission.problemID,
      log: compileResult.log
    }
    await submissionItem.replace(failedSubmission)
  }
}

export async function completeGrading (submissionID: string, log?: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission|GradingSubmission|GradedSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource

  if (submission.status === SubmissionStatus.Graded) {
    return
  }
  if (submission.status === SubmissionStatus.Compiling || submission.gradedCases !== submission.testcases.length) {
    const failedSubmission: FailedSubmission = {
      status: SubmissionStatus.Terminated,
      language: submission.language,
      source: submission.source,
      problemID: submission.problemID,
      log,
      id: submission.id
    }
    await submissionItem.replace(failedSubmission)
  } else {
    let score = 0
    submission.testcases.forEach(testcase => {
      if (testcase.result != null && testcase.result.status === GradingStatus.Accepted) {
        score += testcase.points
      }
    })
    const gradedSubmission: GradedSubmission = {
      status: SubmissionStatus.Graded,
      language: submission.language,
      source: submission.source,
      problemID: submission.problemID,
      id: submission.id,
      // @ts-expect-error Since we've previously checked that the number of graded testcase is equal to the number of total testcases, we can assume that all testcases have a result property.
      testcases: submission.testcases,
      score
    }
    await submissionItem.replace(gradedSubmission)
  }
}

export async function handleGradingResult (gradingResult: GradingResult, submissionID, testcaseIndex): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<GradingSubmission|FailedSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  if (submission.status === SubmissionStatus.Grading) {
    if (submission.testcases[testcaseIndex] == null) {
      throw new NotFoundError('Testcase not found.', testcaseIndex)
    }
    if (submission.testcases[testcaseIndex].result == null) {
      submission.gradedCases += 1
    }
    submission.testcases[testcaseIndex].result = gradingResult
    await submissionItem.replace(submission)
    if (submission.gradedCases === submission.testcases.length) {
      await completeGrading(submissionID)
    }
  }
}

export async function fetchSubmission (submissionID: string): Promise<GradingSubmission|CompilingSubmission|GradedSubmission|FailedSubmission> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<GradingSubmission|CompilingSubmission|GradedSubmission|FailedSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found.', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', submissionFetchResult)
    }
  }
  return submissionFetchResult.resource
}
