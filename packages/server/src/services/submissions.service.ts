import {
  CompileTask, CompilingSubmission, NewSubmission,
  cosmosDB,
  AzureError, NotFoundError, DataError, JudgerTaskType,
  languageConfigs, messageSender,
  CompileSucceeded, CompileFailed, CompileStatus,
  Problem,
  GradeTask
  , GradingSubmission
  , SubmissionStatus
  , FailedSubmission
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

export async function handleCompileResult (compileResult: CompileSucceeded|CompileFailed): Promise<void> {
  const submissionID = compileResult.submissionID
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
    const submissionTestcases: Array<{points: number}> = []
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
      submissionTestcases.push({ points: testcase.points })
    })
    await messageSender.sendMessages(batch)
    await messageSender.close()
    const gradingSubmission: GradingSubmission = {
      status: SubmissionStatus.Grading,
      language: submission.language,
      source: submission.source,
      submissionID: submission.submissionID,
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
      submissionID: submission.submissionID,
      problemID: submission.problemID
    }
    await submissionItem.replace(failedSubmission)
  }
}
