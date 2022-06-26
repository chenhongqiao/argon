import {
  AzureError,
  CompileResult,
  CompileStatus,
  CompileTask,
  CompilingSubmission,
  cosmosDB,
  DataError,
  FailedSubmission,
  GradedSubmission,
  GradeStatus,
  GradeTask,
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
const problemsContainer = cosmosDB.container('submissions')

export async function createSubmission (submission: NewSubmission): Promise<{ submissionID: string }> {
  const result = await submissionsContainer.items.create(submission)
  if (result.resource != null) {
    return { submissionID: result.resource.id }
  }
  throw new AzureError('No resource ID returned', result)
}

export async function compileSubmission (submissionID: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  const task: CompileTask = {
    submissionID: submission.id,
    source: submission.source,
    type: JudgerTaskType.Compile,
    language: submission.language,
    constrains: languageConfigs[submission.language].constrains
  }
  const batch = await messageSender.createMessageBatch()
  if (!(Boolean(batch.tryAddMessage({ body: task })))) {
    throw new DataError('Task too big to fit in the queue', JSON.stringify(submission))
  }
  await messageSender.sendMessages(batch)
  await messageSender.close()
}

export async function handleCompileResult (compileResult: CompileResult, submissionID: string): Promise<void> {
  const submissionItem = submissionsContainer.item(submissionID, submissionID)
  const submissionFetchResult = await submissionItem.read<CompilingSubmission>()
  if (submissionFetchResult.resource == null) {
    if (submissionFetchResult.statusCode === 404) {
      throw new NotFoundError('Submission not found', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  if (compileResult.status === CompileStatus.Succeeded) {
    const batch = await messageSender.createMessageBatch()
    const problemItem = problemsContainer.item(submission.problemID, submission.problemID)
    const problemFetchResult = await problemItem.read<Problem>()
    if (problemFetchResult.resource == null) {
      if (problemFetchResult.statusCode === 404) {
        throw new NotFoundError('Problem not found', submission.problemID)
      } else {
        throw new AzureError('Unexpected CosmosDB return', problemFetchResult)
      }
    }
    const problem: Problem = problemFetchResult.resource
    const submissionTestcases: Array<{points: number, input: string, output: string}> = []
    problem.testcases.forEach((testcase, index) => {
      const task: GradeTask = {
        constraints: problem.constraints,
        type: JudgerTaskType.Grade,
        submissionID,
        testcaseID: {
          input: testcase.input,
          output: testcase.output
        },
        testcaseIndex: index,
        language: submission.language
      }
      if (!(Boolean(batch.tryAddMessage({ body: task })))) {
        throw new DataError('Task too big to fit in the queue', JSON.stringify(task))
      }
      submissionTestcases.push({ points: testcase.points, input: testcase.input, output: testcase.output })
    })
    await messageSender.sendMessages(batch)
    await messageSender.close()
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
      throw new NotFoundError('Submission not found', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return', submissionFetchResult)
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
      if (testcase.result != null && testcase.result.status === GradeStatus.Accepted) {
        score += testcase.points
      }
    })
    const gradedSubmission: GradedSubmission = {
      status: SubmissionStatus.Graded,
      language: submission.language,
      source: submission.source,
      problemID: submission.problemID,
      id: submission.id,
      // @ts-expect-error
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
      throw new NotFoundError('Submission not found', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return', submissionFetchResult)
    }
  }
  const submission = submissionFetchResult.resource
  if (submission.status === SubmissionStatus.Grading) {
    if (submission.testcases[testcaseIndex] == null) {
      throw new NotFoundError('Testcase not found', testcaseIndex)
    }
    submission.testcases[testcaseIndex].result = gradingResult
    submission.gradedCases += 1
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
      throw new NotFoundError('Submission not found', submissionID)
    } else {
      throw new AzureError('Unexpected CosmosDB return', submissionFetchResult)
    }
  }
  return submissionFetchResult.resource
}
